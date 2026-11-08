import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createClient } from "@supabase/supabase-js"
import { projectId, publicAnonKey } from "../utils/supabase/info"

const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey)
const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-1f83fbc0`
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      "expired-callback": () => void
      "error-callback": () => void
      theme: "light"
    },
  ) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let turnstileLoader: Promise<TurnstileApi> | null = null

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (turnstileLoader) return turnstileLoader
  turnstileLoader = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/"]',
    )
    const script = existing ?? document.createElement("script")
    const onLoad = () =>
      window.turnstile
        ? resolve(window.turnstile)
        : reject(new Error("Turnstile tidak tersedia"))
    script.addEventListener("load", onLoad, { once: true })
    script.addEventListener(
      "error",
      () => reject(new Error("Turnstile gagal dimuat")),
      {
        once: true,
      },
    )
    if (!existing) {
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
  })
  return turnstileLoader
}

function TurnstileChallenge({ onToken }: { onToken: (token: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !containerRef.current) return
    let active = true
    let widgetId = ""
    loadTurnstile()
      .then((turnstile) => {
        if (!active || !containerRef.current) return
        widgetId = turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: onToken,
          "expired-callback": () => onToken(""),
          "error-callback": () => onToken(""),
          theme: "light",
        })
      })
      .catch(() => onToken(""))
    return () => {
      active = false
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [onToken])

  if (!TURNSTILE_SITE_KEY) return null
  return <div className="turnstile-wrap" ref={containerRef} />
}

type IconName = "search" | "pin" | "clock" | "shield" | "plus" | "arrow" | "eye-off" | "sparkles" | "check" | "x" | "upload" | "user" | "chat" | "bell"

type IconProps = {
  name: IconName
  size?: number
}

function Icon({ name, size = 18 }: IconProps) {
  const paths: Record<IconName, ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M14 7l5 5-5 5" />
      </>
    ),
    "eye-off": (
      <>
        <path d="m3 3 18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A11.2 11.2 0 0 1 12 4c6 0 9 8 9 8a17 17 0 0 1-2.1 3.2M6.6 6.6C4.2 8 3 12 3 12s3 8 9 8c1.1 0 2.1-.3 3-.7" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3Z" />
        <path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14ZM19 14l.6 1.4L21 16l-1.4.6L19 18l-.6-1.4L17 16l1.4-.6L19 14Z" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    x: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4m-4 4 4-4 4 4" />
        <path d="M5 14v5h14v-5" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    chat: (
      <>
        <path d="M5 18.5 3 21v-5a8 8 0 1 1 3 3.1" />
        <path d="M8 11h.01M12 11h.01M16 11h.01" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
  }
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function Button({
  children,
  variant = "primary",
  className = "",
  onClick,
  type = "button",
  ariaLabel,
  disabled = false,
}: {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost"
  className?: string
  onClick?: () => void
  type?: "button" | "submit"
  ariaLabel?: string
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      className={`button button-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function Title({
  children,
  level = 2,
  className = "",
}: {
  children: ReactNode
  level?: number
  className?: string
}) {
  return (
    <div role="heading" aria-level={level} className={className}>
      {children}
    </div>
  )
}

type Item = {
  id?: string
  type?: "lost" | "found"
  status?: string
  name: string
  category: string
  location: string
  time: string
  image: string
  private: boolean
  color: string
}

type SavedReport = Item & {
  id: string
  type: "lost" | "found"
  status: string
  ownerId: string
  ownerName: string
  createdAt: string
}

type Account = {
  id: string
  name: string
  email: string
  role: string
}
type Notification = {
  id: string
  title: string
  detail: string
  read: boolean
  createdAt: string
  target?: "reports" | "account" | "claim"
  itemName?: string
}

const STORAGE = {
  notifications: "findmystuff:notifications",
}

function loadStored<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) as T : fallback
  } catch {
    return fallback
  }
}

const items: Item[] = []

const categories = [
  "Semua",
  "Elektronik",
  "Tas & dompet",
  "Aksesori",
  "Dokumen",
]

function ItemCard({
  item,
  onClaim,
  onChat,
}: {
  item: Item
  onClaim: (name: string) => void
  onChat: (name: string) => void
}) {
  return (
    <article className="item-card">
      <div className={`item-image ${item.color}`}>
        <img
          className={item.private ? "private-image" : ""}
          src={item.image}
          alt={
            item.private
              ? "Foto barang disamarkan untuk menjaga privasi"
              : item.name
          }
        />
        <span className="category-tag">{item.category}</span>
        {item.type && (
          <span className={`report-type-tag ${item.type}`}>
            {item.type === "lost" ? "Hilang" : "Ditemukan"}
          </span>
        )}
        {item.private && (
          <div className="blur-badge">
            <Icon name="eye-off" size={15} /> Foto disamarkan
          </div>
        )}
      </div>
      <div className="item-content">
        <Title level={3} className="item-name">
          {item.name}
        </Title>
        <div className="meta">
          <Icon name="pin" size={16} />
          <span>{item.location}</span>
        </div>
        <div className="meta">
          <Icon name="clock" size={16} />
          <span>{item.time}</span>
        </div>
        <div className="card-actions">
          <button className="chat-link" onClick={() => onChat(item.name)}>
            <Icon name="chat" size={15} /> Room chat
          </button>
          <button className="claim-link" onClick={() => onClaim(item.name)}>
            Ini barang saya <Icon name="arrow" size={16} />
          </button>
        </div>
      </div>
    </article>
  )
}

export default function App() {
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("Semua")
  const [modal, setModal] =
    useState<"report" | "edit" | "claim" | "login" | "chat" | null>(null)
  const [selectedItem, setSelectedItem] = useState("")
  const [notice, setNotice] = useState("")
  const [showAll, setShowAll] = useState(false)
  const [reportType, setReportType] = useState<"lost" | "found">("lost")
  const [uploadedFile, setUploadedFile] = useState<{
    name: string
    preview: string
    publicPreview: string
    isExisting?: boolean
  } | null>(null)
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [reports, setReports] = useState<SavedReport[]>([])
  const [currentUser, setCurrentUser] = useState<Account | null>(null)
  const [editingReport, setEditingReport] = useState<SavedReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false)
  const [captchaToken, setCaptchaToken] = useState("")
  const [captchaKey, setCaptchaKey] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    loadStored(STORAGE.notifications, [
      {
        id: "welcome",
        title: "Selamat datang di FindMyStuff",
        detail: "Notifikasi status laporan dan klaim akan muncul di sini.",
        read: false,
        createdAt: "Baru saja",
        target: "reports",
      },
    ]),
  )
  const [showNotifications, setShowNotifications] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState([
    {
      from: "finder",
      text: "Halo, saya yang menemukan barang ini. Silakan jelaskan ciri khususnya tanpa membagikan data sensitif.",
    },
  ])

  const allItems = useMemo(() => [...reports, ...items], [reports])
  const myReports = useMemo(
    () =>
      currentUser
        ? reports.filter((report) => report.ownerId === currentUser.id)
        : [],
    [currentUser, reports],
  )

  const filteredItems = useMemo(
    () =>
      allItems.filter((item) => {
        const matchesCategory =
          activeCategory === "Semua" || item.category === activeCategory
        const text =
          `${item.name} ${item.location} ${item.category}`.toLowerCase()
        return matchesCategory && text.includes(query.toLowerCase())
      }),
    [activeCategory, allItems, query],
  )

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE.notifications, JSON.stringify(notifications))
    } catch {
      // Notifikasi tetap tersedia selama halaman ini terbuka.
    }
  }, [notifications])

  useEffect(() => {
    setCaptchaToken("")
  }, [authMode, modal])

  useEffect(() => {
    loadReports()
    supabase.auth
      .getSession()
      .then(({ data }) => setUserFromSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserFromSession(session)
      if (session?.user)
        setModal((current) => (current === "login" ? null : current))
    })
    const refresh = window.setInterval(loadReports, 20000)
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") loadReports()
    }
    document.addEventListener("visibilitychange", refreshWhenVisible)
    return () => {
      data.subscription.unsubscribe()
      window.clearInterval(refresh)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
    }
  }, [])

  function setUserFromSession(
    session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"],
  ) {
    if (!session?.user) {
      setCurrentUser(null)
      return
    }
    setCurrentUser({
      id: session.user.id,
      name:
        session.user.user_metadata?.name ||
        session.user.user_metadata?.full_name ||
        session.user.email?.split("@")[0] ||
        "Pengguna",
      email: session.user.email || "",
      role: session.user.app_metadata?.role || "user",
    })
  }

  async function apiRequest(path: string, options: RequestInit = {}) {
    const { data } = await supabase.auth.getSession()
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        apikey: publicAnonKey,
        Authorization: `Bearer ${data.session?.access_token || publicAnonKey}`,
        ...options.headers,
      },
    })
    const payload = await response.json()
    if (!response.ok)
      throw new Error(payload.error || "Terjadi kesalahan pada server.")
    return payload
  }

  async function loadReports() {
    try {
      const payload = await apiRequest("/reports")
      setReports(payload.reports || [])
      if (payload.resetAt) {
        const { data } = await supabase.auth.getSession()
        const createdAt = data.session?.user.created_at
        if (createdAt && new Date(createdAt) < new Date(payload.resetAt)) {
          await supabase.auth.signOut()
          setNotifications([])
          localStorage.removeItem("findmystuff:account")
          localStorage.removeItem("findmystuff:session")
          localStorage.removeItem("findmystuff:reports")
          showNotice("Data lama telah direset. Silakan daftar kembali.")
        }
      }
    } catch (error) {
      showNotice(
        error instanceof Error ? error.message : "Laporan gagal dimuat.",
      )
    } finally {
      setIsLoading(false)
    }
  }

  function addNotification(
    title: string,
    detail: string,
    target: Notification["target"] = "reports",
    itemName?: string,
  ) {
    setNotifications((current) => [
      {
        id: crypto.randomUUID(),
        title,
        detail,
        read: false,
        createdAt: "Baru saja",
        target,
        itemName,
      },
      ...current,
    ])
  }

  function openEdit(report: SavedReport) {
    setEditingReport(report)
    setReportType(report.type)
    setUploadedFile({
      name: "Foto saat ini",
      preview: report.image,
      publicPreview: report.image,
      isExisting: true,
    })
    setModal("edit")
  }

  async function deleteReport(report: SavedReport) {
    if (
      !window.confirm(
        `Hapus laporan ${report.name}? Tindakan ini tidak dapat dibatalkan.`,
      )
    )
      return
    try {
      await apiRequest(`/reports/${report.id}`, { method: "DELETE" })
      setReports((current) => current.filter((item) => item.id !== report.id))
      showNotice(`${report.name} berhasil dihapus.`)
    } catch (error) {
      showNotice(
        error instanceof Error ? error.message : "Laporan gagal dihapus.",
      )
    }
  }

  function openNotification(notification: Notification) {
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item,
      ),
    )
    setShowNotifications(false)

    if (notification.target === "account") {
      setModal("login")
      return
    }
    if (notification.target === "claim" && notification.itemName) {
      openClaim(notification.itemName)
      return
    }

    setActiveCategory("Semua")
    setQuery(notification.itemName ?? "")
    setShowAll(true)
    setModal(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function showNotice(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(""), 5000)
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const currentModal = modal
    const formData = new FormData(event.currentTarget)

    if (currentModal === "login") {
      const email = String(formData.get("email") || "")
        .trim()
        .toLowerCase()
      const password = String(formData.get("password") || "")
      if (TURNSTILE_SITE_KEY && !captchaToken) {
        showNotice("Selesaikan pemeriksaan keamanan terlebih dahulu.")
        return
      }
      if (
        authMode === "register" &&
        (password.length < 12 ||
          !/[a-z]/.test(password) ||
          !/[A-Z]/.test(password) ||
          !/\d/.test(password))
      ) {
        showNotice(
          "Kata sandi harus minimal 12 karakter dan mengandung huruf besar, huruf kecil, serta angka.",
        )
        return
      }
      setIsAuthSubmitting(true)
      try {
        if (authMode === "register") {
          const name = String(formData.get("name") || "").trim()
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { name },
              emailRedirectTo: window.location.origin,
              captchaToken,
            },
          })
          if (error) {
            showNotice(
              "Pendaftaran belum dapat diproses. Periksa data atau coba masuk jika sudah memiliki akun.",
            )
            return
          }
          if (!data.session) {
            setAuthMode("login")
            showNotice(
              "Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.",
            )
            return
          }
          addNotification(
            "Akun berhasil dibuat",
            `Halo ${name}, akunmu siap digunakan.`,
            "account",
          )
          showNotice("Akun berhasil dibuat dan kamu sudah masuk.")
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
            options: { captchaToken },
          })
          if (error) {
            showNotice("Email atau kata sandi tidak sesuai.")
            return
          }
          addNotification(
            "Berhasil masuk",
            "Selamat datang kembali di FindMyStuff.",
            "account",
          )
          showNotice("Berhasil masuk. Selamat datang kembali di FindMyStuff.")
        }
      } catch {
        showNotice(
          "Tidak dapat terhubung ke layanan akun. Periksa koneksi dan coba lagi.",
        )
        return
      } finally {
        setIsAuthSubmitting(false)
        setCaptchaToken("")
        setCaptchaKey((current) => current + 1)
      }
    } else if (currentModal === "report" || currentModal === "edit") {
      if (!currentUser) {
        setAuthMode("login")
        setModal("login")
        showNotice("Silakan masuk untuk menyimpan laporan.")
        return
      }
      if (!uploadedFile?.preview && currentModal === "report") {
        showNotice("Tambahkan foto barang sebelum mengirim laporan.")
        return
      }
      const name = String(formData.get("itemName") || "").trim()
      const reportData = {
        type: reportType,
        name,
        category: String(formData.get("category") || "Aksesori"),
        location: String(formData.get("location") || "").trim(),
        image:
          formData.get("private") === "on"
            ? uploadedFile?.publicPreview
            : uploadedFile?.preview || editingReport?.image,
        originalImage: uploadedFile?.isExisting
          ? undefined
          : uploadedFile?.preview,
        private: formData.get("private") === "on",
        color: "mint",
      }
      try {
        const payload = await apiRequest(
          currentModal === "edit"
            ? `/reports/${editingReport?.id}`
            : "/reports",
          {
            method: currentModal === "edit" ? "PUT" : "POST",
            body: JSON.stringify(reportData),
          },
        )
        setReports((current) =>
          currentModal === "edit"
            ? current.map((item) =>
                item.id === payload.report.id ? payload.report : item,
              )
            : [payload.report, ...current],
        )
      } catch (error) {
        showNotice(
          error instanceof Error ? error.message : "Laporan gagal disimpan.",
        )
        return
      }
      setActiveCategory("Semua")
      setQuery("")
      setShowAll(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
      addNotification(
        currentModal === "edit"
          ? "Postingan diperbarui"
          : "Laporan berhasil diunggah",
        `${name} telah tersimpan dan dapat dilihat oleh semua pengguna.`,
        "reports",
        name,
      )
      showNotice(
        `${name} berhasil ${
          currentModal === "edit" ? "diperbarui" : "diunggah"
        }.`,
      )
      setEditingReport(null)
    } else if (currentModal === "claim") {
      addNotification(
        "Klaim sedang diverifikasi",
        `Klaim untuk ${selectedItem} berhasil dikirim.`,
        "claim",
        selectedItem,
      )
      showNotice("Klaim berhasil dikirim dan akan segera diverifikasi.")
    }

    setModal(null)
    setUploadedFile(null)
  }

  function handleUpload(file?: File) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      showNotice("Ukuran file maksimal 5 MB.")
      return
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showNotice("Gunakan foto JPG, PNG, atau WebP.")
      return
    }
    const imageUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const maxSide = 1600
      const scale = Math.min(
        1,
        maxSide / Math.max(image.naturalWidth, image.naturalHeight),
      )
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(image.naturalWidth * scale)
      canvas.height = Math.round(image.naturalHeight * scale)
      const context = canvas.getContext("2d")
      context?.drawImage(image, 0, 0, canvas.width, canvas.height)
      const preview = canvas.toDataURL("image/jpeg", 0.78)
      const blurredCanvas = document.createElement("canvas")
      blurredCanvas.width = canvas.width
      blurredCanvas.height = canvas.height
      const blurredContext = blurredCanvas.getContext("2d")
      if (blurredContext) {
        blurredContext.filter = "blur(28px) saturate(0.65)"
        blurredContext.drawImage(
          canvas,
          -24,
          -24,
          canvas.width + 48,
          canvas.height + 48,
        )
      }
      setUploadedFile({
        name: file.name,
        preview,
        publicPreview: blurredCanvas.toDataURL("image/jpeg", 0.65),
      })
      URL.revokeObjectURL(imageUrl)
    }
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl)
      showNotice("Foto gagal dibaca. Silakan pilih file lain.")
    }
    image.src = imageUrl
  }

  async function logout() {
    await supabase.auth.signOut()
    showNotice("Kamu telah keluar dari akun.")
  }

  function openClaim(name: string) {
    if (!currentUser) {
      setAuthMode("login")
      setModal("login")
      showNotice("Masuk terlebih dahulu untuk mengajukan klaim.")
      return
    }
    setSelectedItem(name)
    setModal("claim")
  }

  function openChat(name: string) {
    if (!currentUser) {
      setAuthMode("login")
      setModal("login")
      showNotice("Masuk terlebih dahulu untuk membuka room konfirmasi.")
      return
    }
    setSelectedItem(name)
    setChatInput("")
    setChatMessages([
      {
        from: "finder",
        text: `Halo, saya pelapor ${name.toLowerCase()}. Silakan jelaskan ciri khususnya tanpa membagikan data sensitif.`,
      },
    ])
    setModal("chat")
  }

  function sendChat(event: FormEvent) {
    event.preventDefault()
    const message = chatInput.trim()
    if (!message) return
    setChatMessages((messages) => [
      ...messages,
      { from: "owner", text: message },
    ])
    setChatInput("")
  }

  return (
    <div className="app-shell">
      <header className="nav-wrap">
        <nav className="nav container" aria-label="Navigasi utama">
          <div className="brand">
            <span className="brand-mark">
              <Icon name="search" size={19} />
            </span>
            <span>
              find<span>my</span>stuff
            </span>
          </div>
          <div className="nav-links">
            <a href="#temuan">Jelajahi temuan</a>
            <a href="#cara-kerja">Cara kerja</a>
            <a href="#keamanan">Keamanan</a>
          </div>
          <div className="nav-actions">
            <div className="notification-wrap">
              <button
                className="notification-button"
                aria-label="Buka notifikasi"
                aria-expanded={showNotifications}
                onClick={() => {
                  setShowNotifications((shown) => !shown)
                  setNotifications((current) =>
                    current.map((notification) => ({
                      ...notification,
                      read: true,
                    })),
                  )
                }}
              >
                <Icon name="bell" size={18} />
                {notifications.some((notification) => !notification.read) && (
                  <span className="notification-dot" />
                )}
              </button>
              {showNotifications && (
                <div className="notification-panel">
                  <div className="notification-head">
                    <Title level={2}>Notifikasi</Title>
                    <button onClick={() => setNotifications([])}>
                      Hapus semua
                    </button>
                  </div>
                  <div className="notification-list">
                    {notifications.map((notification) => (
                      <button
                        className="notification-item"
                        key={notification.id}
                        onClick={() => openNotification(notification)}
                      >
                        <span>
                          <Icon name="bell" size={15} />
                        </span>
                        <div>
                          <b>{notification.title}</b>
                          <p>{notification.detail}</p>
                          <small>
                            {notification.createdAt} · Klik untuk membuka
                          </small>
                        </div>
                      </button>
                    ))}
                    {notifications.length === 0 && (
                      <p className="notification-empty">
                        Belum ada notifikasi baru.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setAuthMode("login")
                setModal("login")
              }}
            >
              <Icon name="user" size={17} />{" "}
              {currentUser ? currentUser.name.split(" ")[0] : "Masuk"}
            </Button>
            <Button
              ariaLabel="Buat laporan"
              onClick={() => {
                setEditingReport(null)
                setUploadedFile(null)
                if (!currentUser) {
                  setAuthMode("login")
                  setModal("login")
                  showNotice("Masuk terlebih dahulu untuk membuat laporan.")
                } else {
                  setModal("report")
                }
              }}
            >
              <Icon name="plus" size={17} />{" "}
              <span className="report-action-label">Buat laporan</span>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        {showAll ? (
          <section className="all-finds-page">
            <div className="all-finds-hero">
              <div className="container">
                <button
                  className="back-button"
                  onClick={() => {
                    setShowAll(false)
                    setQuery("")
                    setActiveCategory("Semua")
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }}
                >
                  <Icon name="arrow" size={17} /> Kembali ke beranda
                </button>
                <div className="eyebrow simple">Pusat barang ditemukan</div>
                <Title level={1} className="all-finds-title">
                  Semua temuan
                </Title>
                <p>
                  Telusuri laporan barang hilang dan ditemukan terbaru dari
                  berbagai lokasi.
                </p>
                <form
                  className="search-box all-search"
                  onSubmit={(event) => event.preventDefault()}
                >
                  <Icon name="search" size={22} />
                  <input
                    aria-label="Cari semua barang temuan"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari barang, lokasi, atau kategori..."
                  />
                  <Button type="submit">Cari barang</Button>
                </form>
              </div>
            </div>
            <div className="container all-finds-content">
              <div className="results-bar">
                <Title className="results-title">
                  {filteredItems.length} laporan tersedia
                </Title>
                <span>Diperbarui secara berkala</span>
              </div>
              <div
                className="filters"
                role="group"
                aria-label="Filter kategori"
              >
                {categories.map((category) => (
                  <button
                    key={category}
                    className={
                      activeCategory === category ? "filter active" : "filter"
                    }
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="items-grid all-items-grid">
                {filteredItems.map((item) => (
                  <ItemCard
                    key={item.id ?? `${item.name}-${item.time}`}
                    item={item}
                    onClaim={openClaim}
                    onChat={openChat}
                  />
                ))}
              </div>
              {isLoading ? (
                <div className="empty-state">Memuat laporan terbaru...</div>
              ) : (
                filteredItems.length === 0 && (
                  <div className="empty-state">
                    Belum ada barang yang cocok. Coba kata kunci atau kategori
                    lain.
                  </div>
                )
              )}
            </div>
          </section>
        ) : (
          <>
            <section className="hero container">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span>
                    <Icon name="sparkles" size={15} />
                  </span>{" "}
                  Temukan lagi yang berarti
                </div>
                <Title level={1} className="hero-title">
                  Barang hilang,
                  <br />
                  <em>bisa kembali.</em>
                </Title>
                <p className="hero-subtitle">
                  Cari barangmu dari laporan warga sekitar. Aman, terverifikasi,
                  dan identitasmu tetap terlindungi.
                </p>
                <form
                  className="search-box"
                  onSubmit={(event) => {
                    event.preventDefault()
                    setActiveCategory("Semua")
                    setShowAll(true)
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }}
                >
                  <Icon name="search" size={22} />
                  <input
                    aria-label="Cari barang hilang"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cari barang, lokasi, atau ciri-ciri..."
                  />
                  <Button type="submit">Cari sekarang</Button>
                </form>
                <div className="hero-stats">
                  <div>
                    <strong>
                      {
                        reports.filter((report) => report.type === "found")
                          .length
                      }
                    </strong>
                    <span>Barang ditemukan</span>
                  </div>
                  <div>
                    <strong>
                      {
                        reports.filter(
                          (report) => report.status === "Sudah kembali",
                        ).length
                      }
                    </strong>
                    <span>Berhasil kembali</span>
                  </div>
                  <div>
                    <strong>
                      {
                        reports.filter(
                          (report) =>
                            report.status === "Terverifikasi" ||
                            report.status === "Sudah kembali",
                        ).length
                      }
                    </strong>
                    <span>Terverifikasi</span>
                  </div>
                </div>
              </div>
              <div
                className="hero-visual"
                aria-label="Ilustrasi barang ditemukan"
              >
                <div className="shape shape-one" />
                <div className="shape shape-two" />
                <div className="hero-photo">
                  <img
                    src="https://images.unsplash.com/photo-1751242864995-967e5b9b6fbb?auto=format&fit=crop&w=1100&q=88"
                    alt="Kumpulan barang pribadi di atas meja"
                  />
                  <div className="found-label">
                    <span>
                      <Icon
                        name={reports.length > 0 ? "check" : "plus"}
                        size={16}
                      />
                    </span>
                    <div>
                      <b>
                        {reports.length > 0
                          ? `${reports.length} laporan aktif`
                          : "Belum ada laporan"}
                      </b>
                      <small>
                        {reports.length > 0
                          ? "Tersinkron untuk semua pengguna"
                          : "Jadilah pelapor pertama"}
                      </small>
                    </div>
                  </div>
                </div>
                <div className="privacy-float">
                  <span>
                    <Icon name="eye-off" size={18} />
                  </span>
                  <div>
                    <b>Privasi aktif</b>
                    <small>Detail sensitif disamarkan</small>
                  </div>
                </div>
              </div>
            </section>

            <section id="temuan" className="finds-section">
              <div className="container">
                <div className="section-head">
                  <div>
                    <div className="eyebrow simple">Temuan terbaru</div>
                    <Title className="section-title">
                      Mungkin ini milikmu?
                    </Title>
                  </div>
                  <button
                    className="link-button"
                    onClick={() => {
                      setShowAll(true)
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                  >
                    Lihat semua temuan <Icon name="arrow" size={17} />
                  </button>
                </div>
                <div
                  className="filters"
                  role="group"
                  aria-label="Filter kategori"
                >
                  {categories.map((category) => (
                    <button
                      key={category}
                      className={
                        activeCategory === category ? "filter active" : "filter"
                      }
                      onClick={() => setActiveCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                <div className="items-grid">
                  {filteredItems.slice(0, 4).map((item) => (
                    <ItemCard
                      key={item.id ?? `${item.name}-${item.time}`}
                      item={item}
                      onClaim={openClaim}
                      onChat={openChat}
                    />
                  ))}
                </div>
                {isLoading ? (
                  <div className="empty-state">Memuat laporan terbaru...</div>
                ) : (
                  filteredItems.length === 0 && (
                    <div className="empty-state">
                      Belum ada barang yang cocok. Coba kata kunci atau kategori
                      lain.
                    </div>
                  )
                )}
              </div>
            </section>

            <section id="cara-kerja" className="process-section container">
              <div className="process-intro">
                <div className="eyebrow simple">
                  Aman dari awal sampai kembali
                </div>
                <Title className="section-title">
                  Bukan sekadar
                  <br />
                  menemukan.
                </Title>
                <p>
                  Setiap klaim melewati proses verifikasi berlapis. Detail
                  penting hanya diketahui pemilik aslinya.
                </p>
                <Button variant="secondary" onClick={() => setModal("report")}>
                  Pelajari prosesnya <Icon name="arrow" size={17} />
                </Button>
              </div>
              <div className="steps">
                {[
                  {
                    icon: "search" as IconName,
                    n: "01",
                    title: "Cari atau laporkan",
                    text: "Telusuri laporan barang ditemukan atau buat laporan kehilangan.",
                  },
                  {
                    icon: "shield" as IconName,
                    n: "02",
                    title: "Verifikasi kepemilikan",
                    text: "Jawab ciri khusus dan unggah identitas atau bukti pembelian.",
                  },
                  {
                    icon: "check" as IconName,
                    n: "03",
                    title: "Ambil dengan aman",
                    text: "Atur pengembalian setelah klaim disetujui dan identitas cocok.",
                  },
                ].map((step) => (
                  <div className="step" key={step.n}>
                    <span className="step-number">{step.n}</span>
                    <span className="step-icon">
                      <Icon name={step.icon} size={22} />
                    </span>
                    <Title level={3} className="step-title">
                      {step.title}
                    </Title>
                    <p>{step.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section id="keamanan" className="privacy-section">
              <div className="container privacy-grid">
                <div className="privacy-demo">
                  <img
                    src="https://images.unsplash.com/photo-1656178798416-47fcbbac4278?auto=format&fit=crop&w=900&q=85"
                    alt="Barang elektronik yang disamarkan"
                  />
                  <div className="scan-line" />
                  <div className="privacy-center">
                    <span>
                      <Icon name="eye-off" size={24} />
                    </span>
                    <b>Privasi otomatis aktif</b>
                    <small>
                      Wajah, dokumen, dan detail sensitif diburamkan
                    </small>
                  </div>
                </div>
                <div className="privacy-copy">
                  <div className="eyebrow light">
                    Privasi yang bekerja untukmu
                  </div>
                  <Title className="privacy-title">
                    Yang pribadi,
                    <br />
                    <em>tetap pribadi.</em>
                  </Title>
                  <p>
                    Sistem kami otomatis mendeteksi dan memburamkan informasi
                    sensitif sebelum laporan tayang.
                  </p>
                  <ul>
                    <li>
                      <span>
                        <Icon name="check" size={15} />
                      </span>{" "}
                      Nomor identitas & kartu
                    </li>
                    <li>
                      <span>
                        <Icon name="check" size={15} />
                      </span>{" "}
                      Foto wajah dan informasi pribadi
                    </li>
                    <li>
                      <span>
                        <Icon name="check" size={15} />
                      </span>{" "}
                      Ciri rahasia untuk proses verifikasi
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="footer container">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="search" size={19} />
          </span>
          <span>
            find<span>my</span>stuff
          </span>
        </div>
        <p>Membantu barang kembali kepada pemiliknya.</p>
        <span>© 2026 FindMyStuff</span>
      </footer>

      {notice && (
        <div className="toast">
          <span>
            <Icon name="check" size={16} />
          </span>
          {notice}
        </div>
      )}

      {modal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setModal(null)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "claim"
                ? "Verifikasi kepemilikan"
                : modal === "login"
                  ? "Akun"
                  : modal === "chat"
                    ? "Room chat konfirmasi"
                    : modal === "edit"
                      ? "Edit laporan"
                      : "Buat laporan"
            }
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Tutup"
              onClick={() => {
                setModal(null)
                setUploadedFile(null)
              }}
            >
              <Icon name="x" />
            </button>
            <span className="modal-icon">
              <Icon
                name={
                  modal === "claim"
                    ? "shield"
                    : modal === "login"
                      ? "user"
                      : modal === "chat"
                        ? "chat"
                        : "plus"
                }
                size={24}
              />
            </span>
            <Title className="modal-title">
              {modal === "claim"
                ? "Verifikasi kepemilikan"
                : modal === "login"
                  ? authMode === "register"
                    ? "Buat akun baru"
                    : "Selamat datang kembali"
                  : modal === "chat"
                    ? "Room konfirmasi"
                    : modal === "edit"
                      ? "Edit postingan"
                      : "Laporkan barang"}
            </Title>
            <p className="modal-subtitle">
              {modal === "claim"
                ? `Ceritakan ciri khusus ${selectedItem.toLowerCase()} yang hanya diketahui pemiliknya.`
                : modal === "login"
                  ? authMode === "register"
                    ? "Daftar untuk membuat laporan dan memantau proses pengembalian barang."
                    : "Masuk untuk memantau laporan, klaim, dan proses pengembalian barangmu."
                  : modal === "chat"
                    ? `Percakapan aman untuk mengonfirmasi kepemilikan ${selectedItem.toLowerCase()}.`
                    : modal === "edit"
                      ? "Perbarui informasi postingan milikmu."
                      : "Pilih jenis laporan dan lengkapi informasi barang dengan jelas."}
            </p>
            <form onSubmit={modal === "chat" ? sendChat : submitForm}>
              {modal === "chat" ? (
                <>
                  <div className="chat-safety">
                    <Icon name="shield" size={16} /> Jangan kirim NIK, alamat
                    lengkap, atau kata sandi di room ini.
                  </div>
                  <div className="chat-room" aria-live="polite">
                    {chatMessages.map((message, index) => (
                      <div
                        className={`chat-message ${message.from}`}
                        key={`${message.from}-${index}`}
                      >
                        <small>
                          {message.from === "finder" ? "Pelapor" : "Anda"}
                        </small>
                        <span>{message.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="chat-compose">
                    <input
                      aria-label="Tulis pesan"
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      placeholder="Tulis ciri khusus barang..."
                    />
                    <Button type="submit" ariaLabel="Kirim pesan">
                      <Icon name="arrow" size={17} />
                    </Button>
                  </div>
                  <button
                    type="button"
                    className="continue-claim"
                    onClick={() => setModal("claim")}
                  >
                    <Icon name="shield" size={16} /> Lanjutkan verifikasi resmi
                  </button>
                </>
              ) : modal === "login" ? (
                currentUser ? (
                  <div className="account-card">
                    <span className="account-avatar">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <b>{currentUser.name}</b>
                      <p>{currentUser.email}</p>
                    </div>
                    <div className="account-stats">
                      <span>
                        <b>{myReports.length}</b>Laporan saya
                      </span>
                      <span>
                        <b>{notifications.length}</b>Notifikasi
                      </span>
                    </div>
                    {myReports.length > 0 && (
                      <div className="account-reports">
                        <Title level={3}>Status laporan</Title>
                        {myReports.map((report) => (
                          <div className="account-report" key={report.id}>
                            <img src={report.image} alt="" />
                            <div>
                              <b>{report.name}</b>
                              <small>{report.status}</small>
                            </div>
                            <div className="account-report-actions">
                              <button
                                type="button"
                                onClick={() => openEdit(report)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="delete-action"
                                onClick={() => deleteReport(report)}
                              >
                                Hapus
                              </button>
                            </div>
                            <div className="status-actions">
                              {report.status === "Sudah kembali" && (
                                <span className="status-done">
                                  <Icon name="check" size={14} />
                                </span>
                              )}
                              {report.status !== "Sudah kembali" && (
                                <small>Dikelola moderator</small>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="secondary"
                      className="full-button"
                      onClick={() => {
                        logout()
                        setModal(null)
                      }}
                    >
                      Keluar dari akun
                    </Button>
                  </div>
                ) : (
                  <>
                    {authMode === "register" && (
                      <label>
                        Nama lengkap
                        <input
                          name="name"
                          required
                          type="text"
                          autoComplete="name"
                          placeholder="Masukkan nama lengkap"
                        />
                      </label>
                    )}
                    <label>
                      Email
                      <input
                        name="email"
                        required
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        placeholder="nama@email.com"
                      />
                    </label>
                    <label>
                      Kata sandi
                      <input
                        name="password"
                        required
                        minLength={authMode === "register" ? 12 : 6}
                        pattern={
                          authMode === "register"
                            ? "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{12,}"
                            : undefined
                        }
                        type="password"
                        autoComplete={
                          authMode === "register"
                            ? "new-password"
                            : "current-password"
                        }
                        placeholder={
                          authMode === "register"
                            ? "Minimal 12 karakter, huruf besar, kecil, dan angka"
                            : "Masukkan kata sandi"
                        }
                      />
                    </label>
                    <TurnstileChallenge
                      key={`${authMode}-${captchaKey}`}
                      onToken={setCaptchaToken}
                    />
                    <Button
                      className="full-button"
                      type="submit"
                      disabled={
                        isAuthSubmitting ||
                        Boolean(TURNSTILE_SITE_KEY && !captchaToken)
                      }
                    >
                      {isAuthSubmitting
                        ? "Mohon tunggu..."
                        : authMode === "register"
                          ? "Daftar"
                          : "Masuk"}{" "}
                      {!isAuthSubmitting && <Icon name="arrow" size={17} />}
                    </Button>
                    <p className="signup-copy">
                      {authMode === "register"
                        ? "Sudah punya akun? "
                        : "Belum punya akun? "}
                      <button
                        type="button"
                        onClick={() =>
                          setAuthMode(
                            authMode === "register" ? "login" : "register",
                          )
                        }
                      >
                        {authMode === "register"
                          ? "Masuk sekarang"
                          : "Daftar sekarang"}
                      </button>
                    </p>
                  </>
                )
              ) : (
                <>
                  {(modal === "report" || modal === "edit") && (
                    <fieldset className="report-type">
                      <legend>Jenis laporan</legend>
                      <label
                        className={
                          reportType === "lost"
                            ? "type-option active"
                            : "type-option"
                        }
                      >
                        <input
                          type="radio"
                          name="report-type"
                          checked={reportType === "lost"}
                          onChange={() => setReportType("lost")}
                        />
                        <span className="type-icon">
                          <Icon name="search" size={19} />
                        </span>
                        <span>
                          <b>Kehilangan</b>
                          <small>Saya kehilangan barang</small>
                        </span>
                      </label>
                      <label
                        className={
                          reportType === "found"
                            ? "type-option active"
                            : "type-option"
                        }
                      >
                        <input
                          type="radio"
                          name="report-type"
                          checked={reportType === "found"}
                          onChange={() => setReportType("found")}
                        />
                        <span className="type-icon">
                          <Icon name="check" size={19} />
                        </span>
                        <span>
                          <b>Menemukan</b>
                          <small>Saya menemukan barang</small>
                        </span>
                      </label>
                    </fieldset>
                  )}
                  <label>
                    {modal === "claim" ? "Ciri khusus barang" : "Nama barang"}
                    <input
                      name="itemName"
                      defaultValue={modal === "edit" ? editingReport?.name : ""}
                      required
                      placeholder={
                        modal === "claim"
                          ? "Contoh: ada goresan kecil di bagian..."
                          : "Contoh: Dompet kulit cokelat"
                      }
                    />
                  </label>
                  {(modal === "report" || modal === "edit") && (
                    <label>
                      Kategori
                      <select
                        name="category"
                        defaultValue={
                          modal === "edit"
                            ? editingReport?.category
                            : "Elektronik"
                        }
                      >
                        {categories.slice(1).map((category) => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    {modal === "claim"
                      ? "Bukti kepemilikan"
                      : reportType === "lost"
                        ? "Lokasi terakhir terlihat"
                        : "Lokasi ditemukan"}
                    <input
                      name="location"
                      defaultValue={
                        modal === "edit" ? editingReport?.location : ""
                      }
                      required
                      placeholder={
                        modal === "claim"
                          ? "Contoh: nomor seri atau detail nota"
                          : "Nama tempat atau area"
                      }
                    />
                  </label>
                  {(modal === "claim" || reportType === "found") && (
                    <label>
                      Nomor kepemilikan / nomor seri
                      <input
                        required
                        inputMode="text"
                        placeholder={
                          modal === "claim"
                            ? "Masukkan nomor yang tercantum pada bukti milikmu"
                            : "Contoh: IMEI, nomor seri, atau kode unik barang"
                        }
                      />
                      <small className="field-help">
                        {modal === "claim"
                          ? "Nomor akan dicocokkan dengan data rahasia dari pelapor."
                          : "Nomor ini disimpan secara rahasia dan digunakan untuk mencocokkan klaim pemilik."}
                      </small>
                    </label>
                  )}
                  <label
                    className={
                      uploadedFile ? "upload-box has-file" : "upload-box"
                    }
                  >
                    <input
                      className="file-input"
                      type="file"
                      accept={
                        modal === "report" || modal === "edit"
                          ? "image/*"
                          : "image/jpeg,image/png,image/webp"
                      }
                      onChange={(event) =>
                        handleUpload(event.target.files?.[0])
                      }
                    />
                    {uploadedFile?.preview ? (
                      <img
                        src={uploadedFile.preview}
                        alt="Pratinjau foto yang diunggah"
                      />
                    ) : (
                      <Icon name="upload" size={21} />
                    )}
                    <span>
                      {uploadedFile
                        ? uploadedFile.name
                        : modal === "claim"
                          ? "Tambahkan foto atau bukti"
                          : "Tambahkan foto barang"}
                    </span>
                    <small>
                      {uploadedFile
                        ? "Klik untuk mengganti file"
                        : "PNG, JPG, atau WebP maksimal 5 MB"}
                    </small>
                  </label>
                  {(modal === "report" || modal === "edit") && (
                    <label className="privacy-check">
                      <input
                        name="private"
                        type="checkbox"
                        defaultChecked={
                          modal === "edit" && editingReport?.private
                        }
                      />{" "}
                      Buramkan foto untuk melindungi informasi pribadi
                    </label>
                  )}
                  <div className="modal-note">
                    <Icon name="shield" size={17} />
                    <span>
                      Nomor kepemilikan dan data sensitif tidak ditampilkan ke
                      publik. Data hanya digunakan untuk mencocokkan verifikasi.
                    </span>
                  </div>
                  <Button className="full-button" type="submit">
                    {modal === "claim"
                      ? "Kirim untuk verifikasi"
                      : modal === "edit"
                        ? "Simpan perubahan"
                        : reportType === "lost"
                          ? "Kirim laporan kehilangan"
                          : "Kirim laporan penemuan"}{" "}
                    <Icon name="arrow" size={17} />
                  </Button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
