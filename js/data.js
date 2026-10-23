// =====================================================================
//  Contenido fijo de la app: catálogo de categorías, plantillas,
//  calendarios de cuidado, productos de ejemplo, reglas y guía.
// =====================================================================

// ---- Catálogo de categorías diarias -----------------------------------
// type: bool | number | scale | text | minutes | bool_minutes | money | exercise
export const CATALOG = [
  { key: 'exercise', name: 'Ejercicio', icon: '🏋️', type: 'exercise', section: 'Movimiento' },
  { key: 'steps', name: 'Pasos', icon: '👟', type: 'number', section: 'Movimiento', unit: 'pasos', target: 8000 },

  { key: 'water', name: 'He bebido agua suficiente', icon: '💧', type: 'bool', section: 'Cuerpo' },
  { key: 'healthy_food', name: 'He comido saludable', icon: '🥗', type: 'bool', section: 'Cuerpo' },
  { key: 'sleep8', name: 'He dormido 8 h', icon: '🌙', type: 'bool', section: 'Cuerpo' },
  { key: 'mood', name: 'Ánimo', icon: '☁️', type: 'scale', section: 'Cuerpo' },
  { key: 'energy', name: 'Energía', icon: '⚡', type: 'scale', section: 'Cuerpo' },
  { key: 'period', name: 'Día de periodo', icon: '🩸', type: 'bool', section: 'Cuerpo' },
  { key: 'retainers', name: 'Me he puesto los retenedores', icon: '🦷', type: 'bool', section: 'Cuerpo' },

  { key: 'creatine', name: 'Creatina', icon: '🥄', type: 'bool', section: 'Suplementos' },
  { key: 'whey', name: 'Proteína whey', icon: '🥤', type: 'bool', section: 'Suplementos' },
  { key: 'magnesium', name: 'Magnesio', icon: '💊', type: 'bool', section: 'Suplementos' },
  { key: 'collagen', name: 'Colágeno', icon: '✨', type: 'bool', section: 'Suplementos' },

  { key: 'am_routine', name: 'Rutina de mañana', icon: '☀️', type: 'bool', section: 'Cuidado' },
  { key: 'pm_routine', name: 'Rutina de noche', icon: '🌙', type: 'bool', section: 'Cuidado' },
  { key: 'spf', name: 'Protector solar', icon: '🧴', type: 'bool', section: 'Cuidado' },
  { key: 'body_hydration', name: 'Hidratación corporal', icon: '🤍', type: 'bool', section: 'Cuidado' },
  { key: 'skin', name: 'Estado de la piel', icon: '🫧', type: 'scale', section: 'Cuidado' },
  { key: 'hair_wash', name: 'Lavado de pelo', icon: '🚿', type: 'bool', section: 'Cuidado' },
  { key: 'lips', name: 'Labios: sin morder ni arrancar', icon: '👄', type: 'bool', section: 'Cuidado' },
  { key: 'shave', name: 'Afeitado / barba', icon: '🪒', type: 'bool', section: 'Cuidado' },
  { key: 'scalp', name: 'Cuidado del cuero cabelludo', icon: '💆', type: 'bool', section: 'Cuidado' },

  { key: 'reading', name: 'He leído', icon: '📖', type: 'bool_minutes', section: 'Mente' },
  { key: 'study', name: 'Estudiar', icon: '📚', type: 'minutes', section: 'Mente', target: 30 },
  { key: 'art', name: 'Algo artístico', icon: '🎨', type: 'bool_minutes', section: 'Mente' },
  { key: 'english', name: 'Inglés', icon: '🇬🇧', type: 'minutes', section: 'Mente', target: 20 },
  { key: 'project', name: 'Proyecto personal', icon: '🚀', type: 'minutes', section: 'Mente', target: 30 },

  { key: 'bed', name: 'He hecho la cama', icon: '🛏️', type: 'bool', section: 'Casa y dinero' },
  { key: 'spend', name: 'Gasto del día', icon: '💶', type: 'money', section: 'Casa y dinero', unit: '€' },

  { key: 'notes', name: 'Notas del día', icon: '✍️', type: 'text', section: 'Notas' },
];

export const SECTIONS = ['Movimiento', 'Cuerpo', 'Suplementos', 'Cuidado', 'Mente', 'Casa y dinero', 'Notas'];

// Cada área tiene su color (como las colecciones de una marca de cosmética)
export const SECTION_COLORS = {
  'Movimiento': '#F4A988', 'Cuerpo': '#A8C99A', 'Suplementos': '#BDB2F0', 'Cuidado': '#F2A9BC',
  'Mente': '#A7BCEB', 'Casa y dinero': '#F2CF7E', 'Notas': '#CFC7BE',
};
const EXTRA_COLORS = ['#96D1CC', '#E8B796', '#D3AEE6', '#A9C8E8', '#E3CF94', '#EFA3AE'];
export const sectionColor = s => SECTION_COLORS[s] || EXTRA_COLORS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % EXTRA_COLORS.length];

export const TYPE_INFO = {
  bool: { icon: '✓', label: 'Sí / no', desc: 'Lo has hecho o no.', ex: 'Hacer la cama, retenedores' },
  number: { icon: '#', label: 'Número', desc: 'Una cantidad con meta opcional.', ex: 'Pasos, vasos de agua' },
  scale: { icon: '◔', label: 'Escala 1–5', desc: 'Cómo ha ido, del 1 al 5.', ex: 'Ánimo, estado de la piel' },
  minutes: { icon: '⏱', label: 'Minutos', desc: 'Tiempo dedicado, con meta.', ex: 'Estudiar, inglés' },
  bool_minutes: { icon: '✓⏱', label: 'Sí + minutos', desc: 'Lo has hecho y cuánto tiempo.', ex: 'Leer, dibujar' },
  money: { icon: '€', label: 'Dinero', desc: 'Cuánto y en qué.', ex: 'Gasto del día' },
  text: { icon: '✎', label: 'Nota', desc: 'Texto libre.', ex: 'Diario, gratitud' },
  exercise: { icon: '🏋️', label: 'Ejercicio', desc: 'Tipo, minutos, km, intensidad.', ex: 'CrossFit, correr' },
};

export const EMOJIS = ['✨', '💧', '🥗', '🌙', '☀️', '🧴', '🫧', '🤍', '💊', '🥄', '🏃', '🏋️', '🧘', '🚶', '🚴', '🏊', '📖', '📚', '🎨', '🎸', '✍️', '🧠', '🇬🇧', '💻', '🛏️', '🧹', '🪴', '🐶', '💶', '🛒', '📵', '☕', '🍎', '🥛', '🍫', '🚭', '🦷', '💅', '💆', '🪒', '🌸', '❤️', '😊', '🙏', '📞', '🎯', '⏰', '🌿'];

export const TYPES = {
  bool: 'Sí / no',
  number: 'Número',
  scale: 'Escala 1–5',
  minutes: 'Minutos',
  bool_minutes: 'Sí / no + minutos',
  money: 'Dinero (€)',
  text: 'Nota de texto',
  exercise: 'Ejercicio (tipo, minutos, km)',
};

// ---- Calendarios de cuidado (recurrentes) ------------------------------
// group: ipl | piel | pelo | cuerpo | unas | maquillaje | barba
export const CARE_CATALOG = [
  { key: 'ipl_axilas', group: 'ipl', name: 'Axilas', head: 'Cabezal axilas', icon: '◐' },
  { key: 'ipl_ingles', group: 'ipl', name: 'Ingles / bikini', head: 'Cabezal bikini', icon: '◑' },
  { key: 'ipl_piernas', group: 'ipl', name: 'Piernas', head: 'Cabezal cuerpo', icon: '◒' },
  { key: 'ipl_brazos', group: 'ipl', name: 'Brazos', head: 'Cabezal cuerpo / brazos', icon: '◓' },
  { key: 'ipl_cara', group: 'ipl', name: 'Cara', head: 'Cabezal cara', icon: '○' },

  { key: 'face_mask', group: 'piel', name: 'Mascarilla facial hidratante', icon: '🫧', interval: 7 },
  { key: 'body_scrub', group: 'cuerpo', name: 'Exfoliación corporal suave', icon: '🧽', interval: 4,
    tip: 'Suave y sin frotar fuerte. Evita la zona que vayas a tratar con IPL ese día.' },
  { key: 'hair_mask', group: 'pelo', name: 'Mascarilla hidratante de pelo', icon: '🌊', interval: 7 },
  { key: 'hair_oil', group: 'pelo', name: 'Aceite de puntas', icon: '💧', interval: 3 },
  { key: 'hair_cut', group: 'pelo', name: 'Sanear puntas (peluquería)', icon: '✂️', interval: 90 },
  { key: 'deep_wash', group: 'pelo', name: 'Lavado a fondo (2 pasadas de champú)', icon: '🫧', interval: 7,
    tip: 'Si usas gel a diario: quita los restos de producto una vez por semana.' },
  { key: 'roller_wash', group: 'maquillaje', name: 'Lavar el rodillo matificante', icon: '🧽', interval: 7 },
  { key: 'hairbrush_clean', group: 'pelo', name: 'Quitar el pelo del cepillo', icon: '🪮', interval: 7,
    tip: 'Una vez al mes, lávalo además con champú.' },
  { key: 'sponge_replace', group: 'maquillaje', name: 'Cambiar la esponja de maquillaje', icon: '🧽', interval: 90,
    tip: 'Cada 3 meses. Lávala cada semana (con las brochas).' },
  { key: 'brushes', group: 'maquillaje', name: 'Lavar brochas y esponjas', icon: '🖌️', interval: 7 },
  { key: 'nails', group: 'unas', name: 'Manicura limpia (casa o cita)', icon: '💅', interval: 14 },
  { key: 'dye_roots', group: 'tinte', name: 'Retoque de raíces', icon: '🎨', interval: 42,
    tip: 'Haz la prueba de alergia 48 h antes. Programa el IPL de cara para otro día.' },
  { key: 'dye_gloss', group: 'tinte', name: 'Baño de brillo / matizador', icon: '💫', interval: 21 },
  { key: 'beard_trim', group: 'barba', name: 'Recortar barba', icon: '🪒', interval: 7 },
  { key: 'barber', group: 'pelo', name: 'Peluquería / barbería', icon: '✂️', interval: 30 },
];

export const CARE_GROUPS = {
  ipl: 'Depilación IPL', piel: 'Piel', cuerpo: 'Cuerpo', pelo: 'Pelo',
  maquillaje: 'Maquillaje', unas: 'Uñas', barba: 'Barba', tinte: 'Tinte',
};
export const CARE_GROUP_COLORS = {
  ipl: '#D3AEE6', piel: '#F2A9BC', cuerpo: '#EDC2A8', pelo: '#96D1CC', maquillaje: '#EFA3AE', unas: '#E4B9D1', barba: '#B8C2CE', tinte: '#E8B796',
};

// ---- Tinte ----
export const DYE_TYPES = ['Permanente', 'Semipermanente', 'Mechas / balayage', 'Decoloración', 'Baño de color / matizador', 'Henna / vegetal'];
export const DYE_PLACES = ['En casa', 'Peluquería'];

// ---- Plantillas de inicio ----------------------------------------------
const ALL = CATALOG.map(c => c.key);
export const TEMPLATES = {
  completa_f: {
    label: 'Completa (chica)',
    cats: ALL.filter(k => !['shave', 'scalp', 'project'].includes(k)),
    care: ['ipl_axilas', 'ipl_ingles', 'ipl_piernas', 'ipl_brazos', 'ipl_cara', 'face_mask', 'body_scrub',
      'hair_mask', 'hair_oil', 'hair_cut', 'brushes', 'nails', 'dye_roots'],
  },
  completa_m: {
    label: 'Completa (chico)',
    cats: ALL.filter(k => !['period', 'hair_wash', 'project'].includes(k)),
    care: ['face_mask', 'body_scrub', 'beard_trim', 'barber'],
  },
  basica: {
    label: 'Básica',
    cats: ['exercise', 'water', 'sleep8', 'healthy_food', 'mood', 'am_routine', 'spf', 'bed', 'notes'],
    care: [],
  },
  vacia: { label: 'Empezar vacía', cats: [], care: [] },
};

// ---- Productos de ejemplo (la lista de Nuria) ---------------------------
// slot: am | pm | both | none ; step: orden dentro de la rutina
// tags: bha, aha, retinoid, vitc, niacinamide, benzoyl, scrub, fragrance, occlusive, spf, hyaluronic
export const SAMPLE_PRODUCTS = [
  { name: 'Sébium Gel Moussant', brand: 'Bioderma', type: 'Limpiador', slot: 'am', step: 1, tags: [], leaveOn: false, pao: 12, store: 'Primor' },
  { name: 'Blemish Control Cleanser (ácido salicílico)', brand: 'CeraVe', type: 'Limpiador', slot: 'pm', step: 1, tags: ['bha'], leaveOn: false, pao: 12, store: 'Primor' },
  { name: 'Sérum Glow efecto lifting niacinamida y platino', brand: 'Deliplus', type: 'Sérum', slot: 'am', step: 2, tags: ['niacinamide'], leaveOn: true, pao: 12, store: 'Mercadona' },
  { name: 'Niacinamide 10% + Zinc 1%', brand: 'The Ordinary', type: 'Sérum', slot: 'pm', step: 2, tags: ['niacinamide'], leaveOn: true, pao: 12, store: 'Primor' },
  { name: 'Hydro Boost Water Gel', brand: 'Neutrogena', type: 'Hidratante', slot: 'am', step: 3, tags: ['hyaluronic'], leaveOn: true, pao: 12, store: 'Primor' },
  { name: 'Revitalift Filler contorno de ojos (ácido hialurónico)', brand: "L'Oréal Paris", type: 'Contorno de ojos', slot: 'both', step: 4, tags: ['hyaluronic'], leaveOn: true, pao: 12, store: 'Primor' },
  { name: 'Fluido solar facial SPF 50+', brand: 'Deliplus', type: 'Protector solar', slot: 'am', step: 9, tags: ['spf'], leaveOn: true, pao: 12, store: 'Mercadona' },
  { name: 'Crema de noche Monster Recovery (mineral)', brand: '', type: 'Crema de noche', slot: 'pm', step: 5, tags: [], leaveOn: true, pao: 12 },
  { name: 'Vaselina', brand: '', type: 'Oclusivo', slot: 'pm', step: 9, tags: ['occlusive'], leaveOn: true, pao: 24 },
  { name: 'Aceite de uñas y cutículas', brand: '', type: 'Uñas', slot: 'none', tags: [], leaveOn: true, pao: 12 },
  { name: 'Crema corporal Good Girl', brand: 'Carolina Herrera', type: 'Corporal', slot: 'none', tags: ['fragrance'], leaveOn: true, pao: 12, note: 'Solo cuerpo: lleva perfume, no en la cara.' },
  { name: 'Mascarilla hidratante de pelo', brand: '', type: 'Pelo', slot: 'none', tags: [], leaveOn: false, pao: 12 },
  { name: 'Aceite de puntas', brand: '', type: 'Pelo', slot: 'none', tags: [], leaveOn: true, pao: 12 },
  { name: 'Gel para rizos', brand: '', type: 'Pelo', slot: 'none', tags: [], leaveOn: true, pao: 12 },
  { name: 'Crema hidratante de rizos', brand: '', type: 'Pelo', slot: 'none', tags: [], leaveOn: true, pao: 12 },
];

export const SAMPLE_PERFUMES = [
  { name: 'Carolina Herrera (New York)', brand: 'Carolina Herrera', family: 'Floral amaderada', moments: ['Noche / Madrid', 'Eventos'], role: 'Signature', note: 'Para noches, salidas y días en los que el perfume es protagonista.' },
  { name: 'Good Girl', brand: 'Carolina Herrera', family: 'Oriental floral', moments: ['Noche / Madrid', 'Eventos'], role: 'Signature' },
  { name: 'Cool de Saphir', brand: 'Saphir', family: 'Oriental floral', moments: ['Día a día limpio', 'Post-gym / fresco'], role: 'Diario / dupe', note: 'Dupe para el día a día, después del Box y para el neceser.' },
];

// ---- Estados del inventario ----
export const STATUS = {
  keep: { e: '✅', l: 'Repongo', d: 'Me lo quedo y lo repongo', c: '#A8C99A' },
  use: { e: '•', l: 'En uso', d: 'En uso, sin decidir', c: '#CFC7BE' },
  useup: { e: '🟡', l: 'Gastar', d: 'Lo gasto y no lo recompro', c: '#F2CF7E' },
  pause: { e: '⏸️', l: 'En pausa', d: 'En pausa (hasta que se curen los labios)', c: '#A7BCEB' },
  drop: { e: '❌', l: 'Lo dejo', d: 'Lo dejo o lo tiro', c: '#EFA3AE' },
  wish: { e: '🛒', l: 'Comprar', d: 'Por comprar', c: '#D3AEE6' },
};
export const AREAS = ['Cuidado facial', 'Maquillaje', 'Pelo', 'Cuerpo', 'Uñas', 'Otros'];
export const MAKEUP_SUBS = ['Piel', 'Mejillas', 'Fijadores', 'Ojos', 'Cejas', 'Labios', 'Herramientas'];
export const DOW_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export const LIP_TRIGGERS = [['ordenador', '💻 Ordenador'], ['coche', '🚗 Coche'], ['series', '📺 Series'], ['estres', '😬 Estrés'], ['aburrimiento', '🥱 Aburrimiento'], ['otro', '✳️ Otro']];

export const PERFUME_MOMENTS = ['Día a día limpio', 'Post-gym / fresco', 'Noche / Madrid', 'Eventos', 'Verano'];

export const SAMPLE_COMBOS = [
  { type: 'layering', name: 'Post-Box que dura', steps: ['Ducha templada', 'Crema corporal neutra con la piel aún húmeda', 'Cool de Saphir en cuello y escote'], notes: 'La piel hidratada retiene mejor el perfume.' },
  { type: 'layering', name: 'Noche Good Girl', steps: ['Crema corporal Good Girl', 'Good Girl en cuello, nuca y detrás de las rodillas'], notes: 'Misma línea: la crema refuerza el perfume.' },
  { type: 'look', name: 'Clean girl en 5 min', steps: ['SPF', 'Corrector solo donde haga falta', 'Colorete en crema en mejillas', 'Gel de cejas peinadas hacia arriba', 'Bálsamo labial', 'Sleek bun o coleta baja'], notes: '' },
  { type: 'look', name: 'Noche / Madrid', steps: ['Piel glow con iluminador líquido', 'Colorete en crema', 'Máscara', 'Lápiz de labios nude + bálsamo', 'Ondas naturales sueltas'], notes: '' },
  { type: 'look', name: 'Eventos', steps: ['Prebase hidratante', 'Base ligera', 'Contorno suave en crema', 'Ojo ahumado neutro', 'Labio porcelana/nude', 'Fijador'], notes: '' },
];

export const POST_GYM_PROTOCOL = [
  'Quítate la ropa sudada en cuanto puedas: el sudor atrapado favorece granitos en espalda y escote.',
  'Ducha templada, no muy caliente (el agua muy caliente reseca).',
  'Cara: limpiador suave (Sébium) y tu hidratante. Si vas a salir de día, SPF.',
  'Pelo: si no toca lavado, aclara el cuero cabelludo con agua y pon acondicionador solo en medios y puntas.',
  'Cuerpo: crema con la piel aún húmeda, dentro de los primeros minutos.',
  'Perfume después de la crema (layering post-Box).',
  'Si toca IPL hoy: espera al menos 12 h desde el entreno.',
];

// ---- Reglas de compatibilidad de ingredientes ---------------------------
export const TAG_LABELS = {
  bha: 'Ácido salicílico (BHA)', aha: 'Ácidos AHA (glicólico, láctico…)', retinoid: 'Retinoide',
  vitc: 'Vitamina C (ácido ascórbico)', niacinamide: 'Niacinamida', benzoyl: 'Peróxido de benzoilo',
  scrub: 'Exfoliante físico (gránulos)', fragrance: 'Perfume', occlusive: 'Oclusivo (vaselina…)',
  spf: 'Protector solar', hyaluronic: 'Ácido hialurónico',
};

export const INGREDIENT_KEYWORDS = [
  ['bha', /salicylic|salic[ií]lico/i],
  ['aha', /glycolic|lactic acid|mandelic|glic[oó]lico|l[aá]ctico|mand[eé]lico/i],
  ['retinoid', /retinol|retinal|retinyl|adapalene|tretinoin|retinoate/i],
  ['vitc', /ascorbic acid|ascorbyl|asc[oó]rbico/i],
  ['niacinamide', /niacinamide|niacinamida/i],
  ['benzoyl', /benzoyl peroxide|per[oó]xido de benzoilo/i],
  ['fragrance', /\bparfum\b|fragrance|perfume/i],
  ['occlusive', /petrolatum|vaselin/i],
  ['hyaluronic', /hyaluron|hialur/i],
];

// Cada regla: when(tagsEnLaMismaRutina) -> mensaje
export const RULES = [
  { id: 'retinoid_acid', level: 'warn', test: t => t.retinoid && (t.aha || t.bha_leave),
    msg: 'Retinoide + ácido exfoliante en la misma noche: mucha irritación. Alterna noches (skin cycling).' },
  { id: 'retinoid_bpo', level: 'warn', test: t => t.retinoid && t.benzoyl,
    msg: 'Retinoide + peróxido de benzoilo juntos: irritación y algunos retinoides se degradan. Uno por la mañana y otro por la noche, o noches alternas.' },
  { id: 'double_exfoliant', level: 'warn', test: t => (t.aha && t.bha_leave) || ((t.aha || t.bha_leave) && t.scrub),
    msg: 'Dos exfoliantes en la misma rutina: riesgo de sobreexfoliación. Quédate con uno.' },
  { id: 'vitc_acid', level: 'info', test: t => t.vitc && (t.aha || t.bha_leave),
    msg: 'Vitamina C + ácidos a la vez pueden picar. Mejor vitamina C por la mañana y ácidos por la noche.' },
  { id: 'occlusive_actives', level: 'info', test: t => t.occlusive && (t.retinoid || t.aha || t.bha_leave),
    msg: 'Vaselina encima de activos que se dejan puestos aumenta su efecto (y la irritación). Esas noches, vaselina solo en labios y zonas secas.' },
  { id: 'fragrance_face', level: 'info', test: t => t.fragrance_face,
    msg: 'Hay un producto perfumado en la rutina facial. El perfume es de lo que más irrita la cara: déjalo para el cuerpo.' },
  { id: 'no_spf', level: 'warn', test: t => t.am && !t.spf && (t.anyActive),
    msg: 'Usas ácidos o retinoides y no hay protector solar en la rutina de mañana. El SPF es obligatorio con activos.' },
];

// ---- Guía de cuidado (consenso dermatológico, con fuentes) -------------
export const SOURCES = {
  lumea_freq: { t: 'Philips · ¿Cada cuánto usar Lumea?', u: 'https://www.philips.co.uk/c-f/XC000003471/how-often-should-i-use-my-philips-lumea' },
  lumea_prep: { t: 'Philips · Cómo preparar un tratamiento Lumea', u: 'https://www.philips.com.au/c-f/XC000021834/how-do-i-prepare-for-a-philips-lumea-treatment' },
  aad_exfol: { t: 'AAD · Cómo exfoliar de forma segura en casa', u: 'https://www.aad.org/public/everyday-care/skin-care-secrets/routine/safely-exfoliate-at-home' },
  aad_routine: { t: 'AAD · Rutina de cuidado de la piel', u: 'https://www.aad.org/public/everyday-care/skin-care-secrets/routine' },
  aad_hairstyles: { t: 'AAD · Peinados que tiran pueden causar caída', u: 'https://www.aad.org/public/diseases/hair-loss/causes/hairstyles' },
  aad_hair_habits: { t: 'AAD · Hábitos que dañan el pelo', u: 'https://www.aad.org/public/everyday-care/hair-scalp-care/hair/habits-that-damage-hair' },
  aad_styling: { t: 'AAD · Peinar sin dañar', u: 'https://www.aad.org/public/diseases/hair-loss/hair-care/styling' },
  aad_sun: { t: 'AAD · Errores comunes con el protector solar', u: 'https://www.aad.org/public/everyday-care/sun-protection/shade-clothing-sunscreen/common-sunscreen-mistakes' },
  aad_color: { t: 'AAD · Consejos para teñir el pelo', u: 'https://www.aad.org/public/everyday-care/hair-scalp-care/hair/coloring-perming-tips' },
  nhs_dye: { t: 'NHS · Reacciones al tinte', u: 'https://www.nhs.uk/conditions/hair-dye-reactions' },
  aad_makeup: { t: 'AAD · ¿Puedo maquillarme si tengo acné?', u: 'https://www.aad.org/public/diseases/acne/causes/makeup' },
  aad_habits: { t: 'AAD · 10 hábitos que pueden empeorar el acné', u: 'https://www.aad.org/public/diseases/acne/skin-care/habits-stop' },
  cc_brushes: { t: 'Cleveland Clinic · Cada cuánto limpiar las brochas', u: 'https://health.clevelandclinic.org/cleaning-makeup-brushes' },
  curology_pilling: { t: 'Curology · Por qué el maquillaje hace bolitas', u: 'https://curology.com/blog/3-reasons-your-cosmetics-are-pilling' },
  aad_acne: { t: 'AAD · Tratamiento del acné adulto', u: 'https://www.aad.org/public/diseases/acne/diy/adult-acne-treatment' },
};

export const GUIDE = [
  {
    id: 'rutina', lead: 'Qué va primero, mañana y noche, con tus productos.', color: '#F2A9BC', title: 'Tu rutina facial, en orden', icon: '🫧',
    body: [
      '<b>Mañana:</b> Sébium (limpiador suave) → sérum Glow de niacinamida → Hydro Boost → contorno de ojos → SPF 50+ siempre al final.',
      '<b>Noche:</b> CeraVe con ácido salicílico → Niacinamida 10% de The Ordinary → contorno → crema de noche → vaselina como último paso (si quieres "slugging").',
      'Orden general: de textura más líquida a más densa, y el protector solar el último por la mañana.',
      'Tener dos limpiadores está bien: el suave por la mañana y el de salicílico por la noche. Si notas tirantez o rojez, usa el de salicílico en noches alternas.',
      'Llevas niacinamida mañana y noche. Es compatible, pero la del 10% puede picar a algunas pieles: si aparece rojez, déjala en noches alternas.',
      'Mito: la niacinamida y la vitamina C <b>sí</b> se pueden usar juntas.',
    ],
    src: ['aad_routine', 'aad_acne'],
  },
  {
    id: 'exfoliar', lead: 'Por qué tu cara ya está bien exfoliada.', color: '#EDC2A8', title: 'Exfoliar: química mejor que física', icon: '🧪',
    body: [
      'En piel mixta-grasa o con tendencia a granitos, lo recomendado es un exfoliante <b>químico suave</b> en vez de gránulos que rasquen.',
      'Tú <b>ya exfolias</b> con el limpiador de ácido salicílico (BHA), que entra en el poro. No añadas exfoliantes de gránulos en la cara.',
      'Más exfoliación no es mejor: si hay ardor, rojez o descamación, para unos días y solo hidrata.',
      'Cuerpo: exfoliación suave 1–2 veces por semana ayuda a prevenir pelos encarnados. Deja 48 h entre exfoliar una zona y hacerle IPL, antes y después: la app te avisa.',
    ],
    src: ['aad_exfol'],
  },
  {
    id: 'cycling', lead: 'Cuándo dar descanso a la piel.', color: '#BDB2F0', title: 'Skin cycling y días de descanso', icon: '🔄',
    body: [
      'Ahora mismo no usas retinoides ni ácidos que se dejen puestos, así que no necesitas un ciclo estricto: tu salicílico se aclara.',
      'Si algún día añades retinol, el esquema clásico de 4 noches es: 1) exfoliante, 2) retinoide, 3) y 4) solo hidratación y reparación.',
      'Señales de que necesitas descanso: escozor al poner la crema, piel tirante y brillante "como plástico", descamación. Esos días: limpiador suave + hidratante + vaselina.',
      'La app revisa tus productos y te avisa si combinas activos que irritan juntos.',
    ],
    src: ['aad_exfol'],
  },
  {
    id: 'spf', lead: 'Todos los días, también en invierno.', color: '#F2CF7E', title: 'Protector solar', icon: '☀️',
    body: [
      'Todos los días, también en invierno y nublado. Cantidad: generosa para cara, cuello y orejas.',
      'Reaplica cada 2 horas si estás al aire libre, y después de sudar mucho o nadar.',
      'La app mira el índice UV de hoy y te avisa cuando conviene reaplicar.',
    ],
    src: ['aad_sun'],
  },
  {
    id: 'ipl', lead: 'Fases, tiempos y qué hacer con el sol.', color: '#D3AEE6', title: 'Philips Lumea: cómo y cuándo', icon: '✨',
    body: [
      '<b>Fase inicial:</b> 4 sesiones, una cada 2 semanas. <b>Mantenimiento:</b> una cada 4 semanas.',
      'Si te saltas una sesión en mantenimiento, puedes seguir o reiniciar la fase inicial. <b>En tu caso</b> (1 sesión y 4 meses de pausa) lo sensato es <b>empezar de nuevo la fase inicial</b>.',
      'Antes de retomar tras el verano: <b>4 semanas sin sol directo sin protección</b> en la zona (2 semanas si usaste autobronceador), y haz una <b>prueba de piel</b> esperando 24 h.',
      'Antes de cada sesión: zona rasurada (o depilada con cera, esperando 24 h), piel limpia y seca, sin cremas ni desodorante, cabezal y cristal limpios. Nunca crema anestésica.',
      'Después: protege del sol la zona, sobre todo las primeras 48 h (ropa o SPF 50).',
      'No pases dos veces por la misma zona en una sesión: no mejora el resultado e irrita.',
      'Regla de la app: si has entrenado en las últimas 12 h, no recomienda IPL. Tras la sesión, evita entreno intenso, sauna y agua muy caliente ese día (recomendación habitual en clínicas para no irritar la piel).',
    ],
    src: ['lumea_freq', 'lumea_prep'],
  },
  {
    id: 'pelo', lead: 'Rizado y fino: lavado, peinados y CrossFit.', color: '#96D1CC', title: 'Pelo rizado y fino', icon: '🌊',
    body: [
      'Tu frecuencia (cada 2 días) está bien. En días de CrossFit muy sudoroso sin tocar lavado: aclara el cuero cabelludo con agua y pon acondicionador solo en medios y puntas.',
      'El champú va al cuero cabelludo; el acondicionador, a medios y puntas. En pelo fino, poca cantidad de crema para no apelmazar.',
      'Difusor a temperatura media o baja y sin frotar con la toalla: aprieta con una camiseta de algodón o toalla de microfibra.',
      '<b>Ojo con el sleek bun:</b> los peinados muy tirantes todos los días pueden provocar caída por tracción. Alterna con moño alto flojo, trenzas o pinza, y usa gomas sin metal o scrunchies de seda.',
      'Mascarilla hidratante semanal, aceite en puntas cada pocos días y sanear puntas cada ~3 meses.',
    ],
    src: ['aad_hair_habits', 'aad_styling', 'aad_hairstyles'],
  },
  {
    id: 'cuerpo', lead: 'Ducha rápida después del Box.', color: '#F4A988', title: 'Cuerpo y post-Box', icon: '🤍',
    body: POST_GYM_PROTOCOL,
    src: ['aad_routine'],
  },
  {
    id: 'tinte', lead: 'Teñir sin estropear tus rizos.', color: '#E8B796', title: 'Tinte de pelo', icon: '🎨',
    body: [
      '<b>Prueba de alergia 48 h antes</b> de usar el tinte, siguiendo las instrucciones de la caja. Las reacciones pueden tardar hasta 72 h en salir.',
      'Si notas picor, ardor, hinchazón o sarpullido, no te tiñas y consulta a un dermatólogo. Usa siempre guantes y no dejes el tinte más tiempo del que indica.',
      'Quédate a <b>tres tonos o menos</b> de tu color natural: aclarar más exige más oxidante y daña más. Los tonos más oscuros son más suaves con el pelo.',
      'El pelo rizado y fino sufre más con la decoloración: puede perder definición. Si quieres aclarar mucho, mejor en peluquería y espaciando sesiones.',
      'Protege el pelo teñido del sol (sombrero o gorra) para que el color dure más.',
      'Retoque de raíces cada 4–6 semanas aprox. La app te avisa y guarda tu historial de tonos y marcas.',
      'No hagas IPL en la cara el mismo día que te tiñes: cada cosa en su día para no irritar la piel.',
    ],
    src: ['aad_color', 'nhs_dye'],
  },
  {
    id: 'pao', lead: 'Cuánto dura cada bote abierto.', color: '#CFC7BE', title: 'Caducidad (PAO)', icon: '⏳',
    body: [
      'El tarrito abierto con "6M", "12M"… indica los meses que dura el producto <b>desde que lo abres</b>.',
      'Apunta la fecha de apertura en Inventario y la app te avisa 30 días antes.',
      'Si cambia el olor, color o textura antes de esa fecha, tíralo igualmente.',
      'Protector solar caducado = menos protección. Máscara de pestañas: normalmente 3–6 meses.',
    ],
    src: [],
  },
];

// ---- Inglés -------------------------------------------------------------
export const ENGLISH_IDEAS = [
  'Pon una serie que ya conozcas en inglés con subtítulos en inglés.',
  'Shadowing 10 min: repite en voz alta frases de un podcast justo después de oírlas.',
  'Escribe 5 frases sobre tu día en inglés en las notas.',
  'Cambia el idioma del móvil una semana.',
  'Aprende 5 palabras nuevas y úsalas hoy en una frase.',
  'Escucha un podcast corto (BBC 6 Minute English) mientras caminas.',
  'Piensa en inglés durante el trayecto: describe lo que ves.',
];

// ---- Frases para motivar -------------------------------------------------
export const QUOTES = [
  'Si solo haces tres cosas hoy, haz estas.',
  'Constancia tranquila, no perfección.',
  'Hecho es mejor que perfecto.',
  'Un día bueno se construye con cosas pequeñas.',
  'Empieza por lo que más pesa; lo demás fluye.',
  'Tu yo de esta noche te lo agradecerá.',
  'Menos, pero mejor.',
];

export const DEFAULT_SETTINGS = {
  exerciseGoal: 45,   // minutos
  projectGoal: 30,    // minutos
  projectName: 'tu proyecto',
  focusKey: 'study',  // qué categoría es la línea 📚 del plan de Hoy
  freeTime: 120,      // minutos disponibles por defecto
  lat: 40.4168, lon: -3.7038, city: 'Madrid',
};
