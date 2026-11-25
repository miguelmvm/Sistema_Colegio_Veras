// Utilitários de perfil/permissões partilhados por portais.html e pelos painéis.
import { db } from './firebase-config.js';
import { collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

/**
 * Procura o documento do utilizador na coleção "users" pelo e-mail.
 * Devolve { docId, ...dados } ou null se não existir.
 */
export async function getUserProfile(email) {
    if (!email) return null;
    const qs = await getDocs(query(collection(db, "users"), where("email", "==", email)));
    if (qs.empty) return null;
    const snap = qs.docs[0];
    return { docId: snap.id, ...snap.data() };
}

export async function isAdminProfile(profile) {
    if (!profile) return false;
    return profile.role === 'coordenador';
}

/** Devolve a página de destino adequada ao perfil, ou null se não houver portal. */
export async function routeForProfile(profile) {
    if (!profile) return null;
    if (profile.role === 'coordenador') return 'painel_coordenador.html';
    if (profile.role === 'professor') return 'painel_professor.html';
    if (profile.role === 'aluno') return 'painel_aluno.html';
    if (profile.role === 'pais') return 'painel_pais.html';
    return null;
}

/** Escapa texto para inserir em innerHTML com segurança. */
export function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Converte "Matemática, Física" em ["Matemática", "Física"]. */
export function parseDisciplinas(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value || '').split(',').map(s => s.trim()).filter(Boolean);
}

/** Dias e blocos horários usados por todas as grelhas (Segunda a Domingo). */
export const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
// Mantêm-se exatamente os mesmos blocos já usados, para não perder horários já gravados.
export const HORAS_AULA = ["08:00 - 08:50", "08:50 - 09:40", "10:00 - 10:50", "10:50 - 11:40", "11:40 - 12:30"];

/**
 * Blocos de aula por turno (usados pela Grelha de Horários do Coordenador).
 * Entradas com `intervalo: true` são pausas (não clicáveis).
 */
export const HORARIOS_POR_TURNO = {
    'Manhã': [
        { hora: "07:20 - 08:10" }, { hora: "08:10 - 09:00" }, { hora: "09:00 - 09:50" },
        { hora: "09:50 - 10:10", intervalo: true },
        { hora: "10:10 - 11:00" }, { hora: "11:00 - 11:50" }, { hora: "11:50 - 12:40" }
    ],
    'Tarde': [
        { hora: "13:00 - 13:50" }, { hora: "13:50 - 14:40" }, { hora: "14:40 - 15:30" },
        { hora: "15:30 - 15:50", intervalo: true },
        { hora: "15:50 - 16:40" }, { hora: "16:40 - 17:30" }, { hora: "17:30 - 18:20" }
    ],
    'Noite': [
        { hora: "19:00 - 19:50" }, { hora: "19:50 - 20:40" },
        { hora: "20:40 - 20:55", intervalo: true },
        { hora: "20:55 - 21:45" }, { hora: "21:45 - 22:35" }
    ]
};

/** Normaliza o texto do turno ("manha", "Manhã", "TARDE"...) para uma chave de HORARIOS_POR_TURNO. */
export function normalizarTurno(turno) {
    const t = String(turno || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (t.startsWith('tard')) return 'Tarde';
    if (t.startsWith('noit')) return 'Noite';
    return 'Manhã';
}

/** Devolve os blocos de aula do turno indicado (por omissão, Manhã). */
export function horasDoTurno(turno) {
    return HORARIOS_POR_TURNO[normalizarTurno(turno)];
}

/** Converte "07:20 - 08:10" em { inicio: 440, fim: 490 } (minutos desde as 00:00), ou null se inválido. */
export function intervaloHora(hora) {
    const m = String(hora || '').match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return { inicio: (+m[1]) * 60 + (+m[2]), fim: (+m[3]) * 60 + (+m[4]) };
}
