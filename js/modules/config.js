export const CONFIG = {
  site: {
    name: "Nandi Mar",
    lang: "es-AR",
    tagline: "Canto que vuelve a la tierra. Cuerpo que recuerda su fuego.",
    roles: ["CANTORA", "MUJER MEDICINA", "FACILITADORA", "SONIDO & CUERPO"],
    hero: { src: "", alt: "Nandi Mar cantando en la selva al atardecer", tone: "selva" },
    cta: { label: "Próximos encuentros", href: "#agenda" }
  },
  about: {
    id: "sobre-mi", navLabel: "Sobre mí", title: "Sobre mí",
    lead: "Soy Nandi Mar. Canto, acompaño y sostengo espacios donde el cuerpo puede volver a sentirse casa.",
    paragraphs: [
      "Crecí entre sierras y fogones, y encontré en la voz un camino de regreso a lo esencial. Durante más de diez años me formé en canto medicina, Shakti Embodiment, Yin Yoga y terapias de sonido junto a maestras y maestros de Argentina, Brasil y la India.",
      "Hoy mi trabajo une esas raíces: conciertos ceremoniales, círculos de mujeres, retiros y sesiones donde el sonido y el movimiento consciente abren lugar para descansar, sentir y recordar."
    ],
    quote: "No vengo a enseñarte nada nuevo. Vengo a acompañarte a recordar lo que tu cuerpo ya sabe.",
    image: { src: "img/IMG_0687.jpg", alt: "Retrato de Nandi Mar con tambor chamánico", tone: "fuego" }
  },
  areas: [
    {
      id: "musica", navLabel: "Música", title: "Música", accent: "ocre",
      subtitle: "Cantos de raíz para despertar la memoria",
      description: "Canciones nacidas del monte, el río y la ceremonia. Voz, tambor, charango y cuencos se entrelazan en un repertorio propio y en cantos de tradición que honran a la tierra y a quienes la habitan.",
      image: { src: "img/IMG_0688.jpg", alt: "Tambor y charango sobre una manta tejida", tone: "tierra" },
      offerings: [
        { title: "Raíz de Agua", meta: "Álbum • 2026", text: "Nueve canciones grabadas en vivo en la sierra, con voz, guitarra y tambores de agua." },
        { title: "Conciertos ceremoniales", meta: "90 min • de 20 a 150 personas", text: "Un recorrido de cantos para escuchar con todo el cuerpo, en salas, casas culturales y espacios abiertos." },
        { title: "Canto en círculo", meta: "Taller • 3 h", text: "Encuentros para cantar en grupo, sin experiencia previa, desde la escucha y el pulso compartido." }
      ],
      media: [
        { type: "spotify", kind: "Álbum en Spotify", title: "Raíz de Agua", url: "https://open.spotify.com/", embed: "", tone: "tierra" },
        { type: "youtube", kind: "Video en vivo", title: "Canto a la Pachamama", url: "https://www.youtube.com/", embed: "", tone: "selva" }
      ],
      events: [
        { title: "Fogón de cantos", date: "2026-08-22", place: "Espacio Tierra", city: "La Plata", country: "Argentina", type: "Concierto", status: "soldout" },
        { title: "Canto a la Pachamama", date: "2026-10-17", place: "Casa Arandú", city: "Tandil", country: "Argentina", type: "Concierto íntimo", link: "https://wa.me/", status: "open", description: "Una noche de cantos de raíz a la luz de las velas, con voz, tambor y cuencos." },
        { title: "Presentación de Raíz de Agua", date: "2026-11-21", place: "Ciudad Cultural Konex", city: "Buenos Aires", country: "Argentina", type: "Lanzamiento", status: "soon", description: "El álbum completo en vivo, con banda e invitadas." },
        { title: "Ceremonia de canto en el bosque", date: "2026-12-12", place: "Reserva Sierra del Tigre", city: "Tandil", country: "Argentina", type: "Concierto ceremonial", status: "soldout" }
      ]
    },
    {
      id: "shakti", navLabel: "Shakti", title: "Shakti Embodiment", accent: "terra",
      subtitle: "El fuego que despierta desde el centro del cuerpo",
      description: "Shakti Embodiment es una práctica de movimiento consciente, respiración y danza intuitiva para habitar el cuerpo con presencia. Trabajamos con la energía vital, la pelvis y el corazón para soltar tensiones, recuperar el placer de moverse y confiar en la propia sabiduría.",
      image: { src: "", alt: "Mujeres danzando en círculo alrededor del fuego", tone: "fuego" },
      offerings: [
        { title: "Círculos", meta: "Mensual • 2 h 30", text: "Encuentros grupales con movimiento, respiración y palabra, siguiendo el ciclo de la luna." },
        { title: "Retiros", meta: "Fin de semana • en la naturaleza", text: "Inmersiones de dos o tres días para profundizar la práctica, con comida consciente y tiempo de silencio." },
        { title: "Sesiones individuales", meta: "75 min • presencial u online", text: "Un espacio a tu medida para explorar lo que tu cuerpo necesita expresar en este momento." }
      ],
      media: [],
      events: [
        { title: "Círculo de equinoccio", date: "2026-09-05", place: "Espacio Ananda", city: "La Plata", country: "Argentina", type: "Círculo", status: "soldout" },
        { title: "Círculo de Shakti · Luna nueva", date: "2026-10-10", place: "Espacio Ananda", city: "La Plata", country: "Argentina", type: "Círculo", link: "https://wa.me/", status: "open", description: "Movimiento, respiración y palabra para sembrar intenciones con la luna nueva." },
        { title: "Retiro: Despertar del fuego", date: "2026-11-06", endDate: "2026-11-08", place: "Eco-lodge Las Nubes", city: "Sierra de la Ventana", country: "Argentina", type: "Retiro", link: "https://wa.me/", status: "open", description: "Tres días de práctica, fuego, silencio y comida consciente al pie de las sierras." },
        { title: "Círculo de solsticio", date: "2026-12-20", place: "Casa Arandú", city: "Tandil", country: "Argentina", type: "Círculo", status: "soon" }
      ]
    },
    {
      id: "sonido", navLabel: "Sonido & Yin", title: "Sound Healing & Yin Yoga", accent: "musgo",
      subtitle: "Quietud, vibración y descanso profundo",
      description: "El Yin Yoga propone posturas suaves y sostenidas que llegan a los tejidos profundos. El Sound Healing acompaña ese estado con cuencos, gongs y voz, llevando al sistema nervioso hacia la calma. Juntos abren una pausa real en medio del ritmo cotidiano.",
      image: { src: "", alt: "Cuencos tibetanos y gong entre helechos", tone: "musgo" },
      offerings: [
        { title: "Baños de sonido", meta: "75 min • grupal", text: "Te recostás y dejás que la vibración de gongs y cuencos te atraviese y te ordene." },
        { title: "Yin & sonido", meta: "Semanal • 90 min", text: "Práctica de Yin Yoga con cierre sonoro, apta para todos los cuerpos y niveles." },
        { title: "Sesiones privadas", meta: "60 min • cuencos sobre el cuerpo", text: "Un tratamiento individual para soltar tensión, dormir mejor y volver a tu centro." }
      ],
      media: [
        { type: "youtube", kind: "Meditación guiada", title: "Respiración y cuencos para dormir", url: "https://www.youtube.com/", embed: "", tone: "musgo" }
      ],
      events: [
        { title: "Baño de gong de invierno", date: "2026-09-19", place: "Sala Om", city: "Tandil", country: "Argentina", type: "Sound Healing", status: "soldout" },
        { title: "Baño de gong y cuencos", date: "2026-10-24", place: "Sala Om", city: "Tandil", country: "Argentina", type: "Sound Healing", link: "https://wa.me/", status: "open", description: "Traé mantita y almohadón. Noventa minutos de vibración y descanso profundo." },
        { title: "Yin & Sonido: jornada de primavera", date: "2026-11-14", place: "Espacio Ananda", city: "La Plata", country: "Argentina", type: "Jornada", status: "soldout" },
        { title: "Inmersión sonora de fin de año", date: "2026-12-27", place: "Casa Arandú", city: "Tandil", country: "Argentina", type: "Sound Healing", status: "soon" }
      ]
    }
  ],
  agenda: { id: "agenda", navLabel: "Agenda", title: "Agenda", intro: "Todos los encuentros en un solo lugar. Elegí un camino o miralos juntos.", allLabel: "Todos", filterLabel: "Filtrar encuentros por área" },
  contact: {
    id: "contacto", navLabel: "Contacto", title: "Quedemos en contacto",
    text: "Para conciertos, retiros, sesiones privadas o simplemente para saludar, escribime. Si querés recibir las fechas antes que nadie, sumate a la carta de luna."
  },
  socials: [
    { name: "Instagram", url: "https://www.instagram.com/", icon: "instagram" },
    { name: "Spotify", url: "https://open.spotify.com/", icon: "spotify" },
    { name: "YouTube", url: "https://www.youtube.com/", icon: "youtube" },
    { name: "WhatsApp", url: "https://wa.me/", icon: "whatsapp" },
    { name: "Email", url: "mailto:hola@nandimar.com", icon: "email" }
  ],
  newsletter: {
    title: "Carta de luna", label: "Tu email", placeholder: "tu@email.com", button: "Suscribirme", sending: "Enviando…",
    success: "Gracias por sumarte. La próxima carta de luna llega a tu bandeja.",
    error: "Ingresá un email válido, por ejemplo nombre@dominio.com.",
    note: "Una carta por luna. Sin spam; podés darte de baja cuando quieras."
  },
  footer: { text: "Canto, cuerpo y sonido desde las sierras.", credits: "Hecho con respeto por la tierra que nos sostiene." },
  ui: {
    status: { open: "Inscripciones abiertas", soldout: "Cupo completo", soon: "Próximamente" },
    formats: "Formatos", listen: "Escuchar y ver", upcoming: "Próximos encuentros", past: "Encuentros anteriores",
    empty: "Nuevas fechas pronto. Sumate a la carta de luna para enterarte primero.",
    book: "Reservar lugar", notify: "Avisame cuando abra", write: "Escribime", full: "Este encuentro ya está completo.", passed: "Este encuentro ya sucedió.",
    load: "Cargar reproductor", openIn: "Abrir en", menuOpen: "Abrir menú", menuClose: "Cerrar menú",
    dt: { date: "Fecha", place: "Lugar", city: "Ciudad", type: "Formato", status: "Estado" }
  }
};
