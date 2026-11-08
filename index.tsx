import { Hono } from "npm:hono"
import { cors } from "npm:hono/cors"
import { logger } from "npm:hono/logger"
import { createClient, type User } from "npm:@supabase/supabase-js@2"
import * as kv from "./kv_store.tsx"

const app = new Hono()
const prefix = "/make-server-1f83fbc0"
const reportPrefix = "report:"
const privateBucket = "findmystuff-private"
const allowedCategories = new Set([
  "Elektronik",
  "Tas & dompet",
  "Aksesori",
  "Dokumen",
])
const privatePlaceholder =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23dff0e8'/%3E%3C/svg%3E"

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
)

type Report = {
  id: string
  type: "lost" | "found"
  status: "Sedang ditinjau" | "Terverifikasi" | "Sudah kembali"
  name: string
  category: string
  location: string
  image?: string
  displayPath?: string
  originalPath?: string
  imageType?: string
  private: boolean
  color: string
  ownerId: string
  ownerName: string
  createdAt: string
}

type ReportInput = Pick<Report, "type" | "name" | "category" | "location" | "private" | "color"> & {
  image: string
  originalImage?: string
}

app.use("*", logger(console.log))

function isAllowedOrigin(origin: string) {
  if (!origin) return true
  if (/^http:\/\/localhost(?::\d+)?$/.test(origin)) return true
  if (/^https:\/\/[a-z0-9-]+\.figma\.site$/.test(origin)) return true
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  return configured.includes(origin)
}

app.use(
  "/*",
  cors({
    origin: (origin) => (isAllowedOrigin(origin) ? origin : ""),
    allowHeaders: ["Content-Type", "Authorization", "apikey"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "Retry-After"],
    maxAge: 600,
  }),
)

app.use("*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff")
  c.header("X-Frame-Options", "DENY")
  c.header("Referrer-Policy", "strict-origin-when-cross-origin")
  c.header(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  )
  c.header("Cache-Control", "no-store")
  const contentLength = Number(c.req.header("content-length") || 0)
  if (["POST", "PUT"].includes(c.req.method) && contentLength > 5_200_000) {
    return c.json({ error: "Ukuran permintaan terlalu besar." }, 413)
  }
  await next()
})

function bearerToken(header?: string) {
  if (!header?.startsWith("Bearer ")) return ""
  return header.slice(7)
}

async function authenticatedUser(c: any) {
  const token = bearerToken(c.req.header("Authorization"))
  if (!token) return null
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  return error ? null : data.user
}

function isAdmin(user: User) {
  return user.app_metadata?.role === "admin"
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .trim()
        .slice(0, maxLength)
    : ""
}

function requestIp(c: any) {
  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(hash))
    .slice(0, 12)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

async function rateLimit(
  c: any,
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
) {
  const window = Math.floor(Date.now() / (windowSeconds * 1000))
  const bucket = `${scope}:${await digest(identifier)}:${window}`
  const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) throw error
  if (!data) {
    c.header("Retry-After", String(windowSeconds))
    return false
  }
  return true
}

async function audit(action: string, actorId: string, reportId?: string) {
  const timestamp = new Date().toISOString()
  await kv.set(`audit:${timestamp}:${crypto.randomUUID()}`, {
    action,
    actorId,
    reportId,
    timestamp,
  })
}

function parseReportInput(body: Record<string, unknown>): ReportInput | null {
  const type =
    body.type === "found" ? "found" : body.type === "lost" ? "lost" : null
  const name = cleanText(body.name, 120)
  const category = cleanText(body.category, 50)
  const location = cleanText(body.location, 160)
  const image = typeof body.image === "string" ? body.image : ""
  const originalImage =
    typeof body.originalImage === "string" ? body.originalImage : undefined
  if (
    !type ||
    !name ||
    !allowedCategories.has(category) ||
    !location ||
    !image ||
    image.length > 2_500_000 ||
    (originalImage && originalImage.length > 2_500_000)
  )
    return null
  return {
    type,
    name,
    category,
    location,
    image,
    originalImage,
    private: body.private === true,
    color: "mint",
  }
}

function decodeImage(dataUrl: string) {
  const match = dataUrl.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/,
  )
  if (!match) return null
  try {
    const binary = atob(match[2])
    if (binary.length > 1_900_000) return null
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    )
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    const png =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    const webp =
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    if (!jpeg && !png && !webp) return null
    const extension = jpeg ? "jpg" : png ? "png" : "webp"
    return { bytes, contentType: match[1], extension }
  } catch {
    return null
  }
}

let bucketReady = false

async function ensurePrivateBucket() {
  if (bucketReady) return
  const { data } = await supabaseAdmin.storage.getBucket(privateBucket)
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(privateBucket, {
      public: false,
      fileSizeLimit: "2MB",
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    })
    if (error && !error.message.toLowerCase().includes("already")) throw error
  }
  bucketReady = true
}

async function storeImages(
  userId: string,
  reportId: string,
  input: ReportInput,
) {
  const display = decodeImage(input.image)
  const original = decodeImage(input.originalImage || input.image)
  if (!display || !original) throw new Error("Format foto tidak valid.")
  await ensurePrivateBucket()
  const version = crypto.randomUUID()
  const displayPath = `${userId}/${reportId}/${version}-display.${display.extension}`
  const originalPath = `${userId}/${reportId}/${version}-original.${original.extension}`
  const displayUpload = await supabaseAdmin.storage
    .from(privateBucket)
    .upload(displayPath, display.bytes, {
      contentType: display.contentType,
      cacheControl: "3600",
      upsert: false,
    })
  if (displayUpload.error) throw displayUpload.error
  const originalUpload = await supabaseAdmin.storage
    .from(privateBucket)
    .upload(originalPath, original.bytes, {
      contentType: original.contentType,
      cacheControl: "3600",
      upsert: false,
    })
  if (originalUpload.error) {
    await supabaseAdmin.storage.from(privateBucket).remove([displayPath])
    throw originalUpload.error
  }
  return { displayPath, originalPath, imageType: display.contentType }
}

async function removeImages(report: Report) {
  const paths = [report.displayPath, report.originalPath].filter(
    (path): path is string => Boolean(path),
  )
  if (paths.length)
    await supabaseAdmin.storage.from(privateBucket).remove(paths)
}

function safeReport(
  report: Report,
  image: string | undefined,
  viewer: User | null,
) {
  const {
    displayPath: _displayPath,
    originalPath: _originalPath,
    imageType: _imageType,
    ownerId,
    ownerName,
    ...safeReport
  } = report
  const canManage = Boolean(
    viewer && (viewer.id === ownerId || isAdmin(viewer)),
  )
  return {
    ...safeReport,
    image,
    ownerId: canManage ? ownerId : "",
    ownerName: canManage ? ownerName : "Pelapor",
  }
}

async function publicReports(reports: Report[], viewer: User | null) {
  const paths = reports
    .map((report) => report.displayPath)
    .filter((path): path is string => Boolean(path))
  const signedByPath = new Map<string, string>()
  if (paths.length) {
    const { data, error } = await supabaseAdmin.storage
      .from(privateBucket)
      .createSignedUrls(paths, 3600)
    if (error) throw error
    data?.forEach((entry, index) => {
      if (entry.signedUrl) signedByPath.set(paths[index], entry.signedUrl)
    })
  }
  return reports.map((report) =>
    safeReport(
      report,
      report.displayPath
        ? signedByPath.get(report.displayPath)
        : report.private
          ? privatePlaceholder
          : report.image,
      viewer,
    ),
  )
}

async function publicReport(report: Report, viewer: User) {
  return (await publicReports([report], viewer))[0]
}

app.get(`${prefix}/health`, (c) => c.json({ status: "ok" }))

app.get(`${prefix}/reports`, async (c) => {
  if (!(await rateLimit(c, "read-reports", requestIp(c), 120, 60)))
    return c.json({ error: "Terlalu banyak permintaan. Coba lagi nanti." }, 429)
  const reports = ((await kv.getByPrefix(reportPrefix)) as Report[])
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 200)
  const viewer = await authenticatedUser(c)
  return c.json({ reports: await publicReports(reports, viewer) })
})

app.post(`${prefix}/reports`, async (c) => {
  const user = await authenticatedUser(c)
  if (!user)
    return c.json({ error: "Silakan masuk untuk membuat laporan." }, 401)
  if (!(await rateLimit(c, "create-report", user.id, 10, 3600)))
    return c.json(
      { error: "Batas pembuatan laporan tercapai. Coba lagi nanti." },
      429,
    )
  const input = parseReportInput(await c.req.json().catch(() => ({})))
  if (!input) return c.json({ error: "Data laporan tidak valid." }, 400)
  const existingReports = (await kv.getByPrefix(reportPrefix)) as Report[]
  if (
    existingReports.filter((report) => report.ownerId === user.id).length >= 25
  )
    return c.json({ error: "Maksimal 25 laporan aktif per akun." }, 409)

  const id = crypto.randomUUID()
  const storedImages = await storeImages(user.id, id, input)
  const report: Report = {
    type: input.type,
    name: input.name,
    category: input.category,
    location: input.location,
    private: input.private,
    color: input.color,
    ...storedImages,
    id,
    status: "Sedang ditinjau",
    ownerId: user.id,
    ownerName:
      cleanText(
        user.user_metadata?.name || user.user_metadata?.full_name,
        80,
      ) ||
      user.email?.split("@")[0] ||
      "Pengguna",
    createdAt: new Date().toISOString(),
  }
  try {
    await kv.set(`${reportPrefix}${report.id}`, report)
  } catch (error) {
    await removeImages(report)
    throw error
  }
  await audit("report.created", user.id, report.id)
  return c.json({ report: await publicReport(report, user) }, 201)
})

app.put(`${prefix}/reports/:id`, async (c) => {
  const user = await authenticatedUser(c)
  if (!user)
    return c.json({ error: "Sesi tidak valid. Silakan masuk kembali." }, 401)
  if (!(await rateLimit(c, "update-report", user.id, 60, 3600)))
    return c.json({ error: "Terlalu banyak perubahan. Coba lagi nanti." }, 429)
  const key = `${reportPrefix}${c.req.param("id")}`
  const existing = (await kv.get(key)) as Report | undefined
  if (!existing) return c.json({ error: "Laporan tidak ditemukan." }, 404)
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>

  if (body.status === "Terverifikasi" || body.status === "Sudah kembali") {
    if (!isAdmin(user))
      return c.json(
        { error: "Hanya moderator yang dapat mengubah status." },
        403,
      )
    const report: Report = { ...existing, status: body.status }
    await kv.set(key, report)
    await audit("report.status_changed", user.id, report.id)
    return c.json({ report: await publicReport(report, user) })
  }

  if (existing.ownerId !== user.id && !isAdmin(user))
    return c.json({ error: "Kamu tidak dapat mengubah laporan ini." }, 403)
  const input = parseReportInput(body)
  if (!input) return c.json({ error: "Data laporan tidak valid." }, 400)

  let storedImages = {
    displayPath: existing.displayPath,
    originalPath: existing.originalPath,
    imageType: existing.imageType,
  }
  const hasNewImage = input.image.startsWith("data:image/")
  if (input.private !== existing.private && !hasNewImage)
    return c.json(
      { error: "Unggah ulang foto saat mengubah pengaturan privasi." },
      400,
    )
  if (hasNewImage) storedImages = await storeImages(user.id, existing.id, input)

  const report: Report = {
    ...existing,
    type: input.type,
    name: input.name,
    category: input.category,
    location: input.location,
    private: input.private,
    ...storedImages,
  }
  await kv.set(key, report)
  if (hasNewImage) await removeImages(existing)
  await audit("report.updated", user.id, report.id)
  return c.json({ report: await publicReport(report, user) })
})

app.delete(`${prefix}/reports/:id`, async (c) => {
  const user = await authenticatedUser(c)
  if (!user)
    return c.json({ error: "Sesi tidak valid. Silakan masuk kembali." }, 401)
  if (!(await rateLimit(c, "delete-report", user.id, 20, 3600)))
    return c.json({ error: "Terlalu banyak permintaan. Coba lagi nanti." }, 429)
  const key = `${reportPrefix}${c.req.param("id")}`
  const existing = (await kv.get(key)) as Report | undefined
  if (!existing) return c.json({ error: "Laporan tidak ditemukan." }, 404)
  if (existing.ownerId !== user.id && !isAdmin(user))
    return c.json({ error: "Kamu tidak dapat menghapus laporan ini." }, 403)
  await kv.del(key)
  await removeImages(existing)
  await audit("report.deleted", user.id, existing.id)
  return c.json({ success: true })
})

app.onError((error, c) => {
  console.error("Unhandled server error", error)
  return c.json({ error: "Terjadi kesalahan pada server." }, 500)
})

Deno.serve(app.fetch)
