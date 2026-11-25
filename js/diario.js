// Diário de Classe — módulo partilhado entre o Painel do Coordenador e o Portal do Docente.
//
// Coleção Firestore "diarios" (um documento por Turma + Data + Disciplina):
//   { turmaId, turmaNome, data: "AAAA-MM-DD", disciplina, professorId, professorName,
//     conteudo, sumario, observacoes, presencas: { [alunoUid]: "P" | "F" }, chamadas: { [alunoUid]: "Presente" | "Falta" },
//     alunos: { [alunoUid]: nome }, totalAlunos, totalPresentes, createdAt, updatedAt }
import { db } from './firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { esc, parseDisciplinas } from './auth-utils.js';

const slug = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const fmtData = iso => iso ? iso.split('-').reverse().join('/') : '';

/**
 * Monta o Diário de Classe dentro de `container`.
 * @param {HTMLElement} container
 * @param {{ profile: object, isAdmin: boolean }} opts
 *   - isAdmin = true  → vê/edita todas as turmas e escolhe o professor responsável.
 *   - isAdmin = false → vê apenas as turmas/disciplinas que leciona (segundo a grelha de horários).
 */
export function initDiario(container, { profile, isAdmin }) {
    const meuUid = profile?.uid || '';
    const meuNome = profile?.name || '';

    container.innerHTML = `
        <div class="panel-card">
            <h3 style="margin-bottom: 0.5rem; color: var(--primary-color);">Diário de Classe</h3>
            <p style="margin-bottom: 1.5rem; color: #666; font-size: 0.95rem;">
                ${isAdmin ? 'Consulta e regista aulas de qualquer turma da escola.' : 'Regista o conteúdo lecionado e a chamada das tuas turmas.'}
            </p>
            <div class="filter-bar">
                <div class="form-group">
                    <label>Turma</label>
                    <select id="dcTurma"><option value="">A carregar turmas...</option></select>
                </div>
                <div class="form-group">
                    <label>Disciplina</label>
                    <select id="dcDisciplina" required>
                        <option value="">Selecione a turma...</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Data da Aula</label>
                    <input type="date" id="dcData">
                </div>
                ${isAdmin ? `
                <div class="form-group">
                    <label>Professor Responsável</label>
                    <select id="dcProfessor"><option value="">A carregar...</option></select>
                </div>` : ''}
                <div>
                    <button type="button" class="btn-primary" id="dcAbrir" style="border: none; width: 100%;">
                        <i class="fa-solid fa-book-open"></i> Abrir Diário
                    </button>
                </div>
            </div>
        </div>

        <div class="panel-card" id="dcRegisto" style="display: none;">
            <h3 id="dcTitulo" style="margin-bottom: 1.5rem; color: var(--primary-color); font-size: 1.5rem;"></h3>
            <form id="dcForm">
                <div class="form-group">
                    <label>Conteúdo Lecionado</label>
                    <textarea class="diario-textarea" id="dcConteudo" required placeholder="Ex: Frações equivalentes — exercícios 1 a 10 da pág. 42"></textarea>
                </div>
                <div class="form-group">
                    <label>Observações (opcional)</label>
                    <textarea class="diario-textarea" id="dcObs" style="min-height: 60px;" placeholder="Tarefas de casa, ocorrências, avisos..."></textarea>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                    <h4 style="font-size: 1.2rem;">Chamada <span id="dcResumo" style="font-size: 0.9rem; color: #64748b; font-weight: 500;"></span></h4>
                    <button type="button" id="dcTodosP" class="btn-primary" style="border: none; background: #16a34a; padding: 0.5rem 1rem; font-size: 0.85rem;">
                        <i class="fa-solid fa-check-double"></i> Todos presentes
                    </button>
                </div>
                <div class="table-responsive">
                    <table id="dcChamada">
                        <thead><tr><th>Aluno</th><th style="width: 180px;">Presença</th></tr></thead>
                        <tbody></tbody>
                    </table>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem;">
                    <button type="button" class="btn-primary" id="dcEliminar" style="border: none; background: #ef4444; display: none;">Eliminar Registo</button>
                    <button type="submit" class="btn-primary" style="border: none;">Guardar Registo</button>
                </div>
            </form>
        </div>

        <div class="panel-card">
            <h3 style="margin-bottom: 1rem; color: var(--primary-color); font-size: 1.5rem;">Histórico de Registos</h3>
            <div class="table-responsive">
                <table id="dcHistorico">
                    <thead><tr><th>Data</th><th>Turma</th><th>Disciplina</th><th>Professor</th><th>Presenças</th><th>Ações</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    `;

    const $ = id => container.querySelector('#' + id);
    const selTurma = $('dcTurma'), inpDisc = $('dcDisciplina'), inpData = $('dcData'), selProf = $('dcProfessor');
    inpData.value = hoje();

    let turmas = {};          // id -> { nome, turno }
    let minhasAulas = [];     // horários do docente (para filtrar turmas/disciplinas)
    let professores = [];     // [{ uid, name }] (apenas admin)
    let atual = null;         // { docId, turmaId, data, disciplina, alunos: [{uid, name}], presencas, existe }

    // ---------- Carregamento inicial ----------
    async function carregarTurmas() {
        const qs = await getDocs(collection(db, "turmas"));
        turmas = {};
        qs.forEach(d => turmas[d.id] = d.data());

        let ids = Object.keys(turmas);
        if (!isAdmin) {
            const hs = await getDocs(query(collection(db, "horarios"), where("professorId", "==", meuUid)));
            minhasAulas = hs.docs.map(d => d.data());
            const minhas = new Set(minhasAulas.map(h => h.turmaId));
            ids = ids.filter(id => minhas.has(id));
        }

        ids.sort((a, b) => (turmas[a].nome || '').localeCompare(turmas[b].nome || ''));
        selTurma.innerHTML = ids.length
            ? '<option value="">Selecione a turma...</option>' + ids.map(id => `<option value="${id}">${esc(turmas[id].nome)} (${esc(turmas[id].turno || '')})</option>`).join('')
            : `<option value="">${isAdmin ? 'Nenhuma turma criada' : 'Ainda não tens turmas atribuídas na grelha de horários'}</option>`;
    }

    async function carregarProfessores() {
        if (!isAdmin) return;
        const qs = await getDocs(query(collection(db, "users"), where("role", "==", "professor")));
        professores = qs.docs.map(d => ({ uid: d.data().uid, name: d.data().name, disciplinas: parseDisciplinas(d.data().disciplinas) }));
        selProf.innerHTML = '<option value="">Selecione o professor...</option>' +
            professores.map(p => `<option value="${esc(p.uid)}">${esc(p.name)}</option>`).join('');
    }

    inpDisc.addEventListener('change', async () => {
        if (!isAdmin) return;
        const turmaId = selTurma.value;
        const disciplina = inpDisc.value;
        if (!turmaId || !disciplina) {
            selProf.value = '';
            selProf.disabled = false;
            return;
        }
        const sugerido = await sugerirProfessor(turmaId, null, disciplina);
        if (sugerido) {
            selProf.value = sugerido;
            selProf.disabled = true;
        } else {
            selProf.value = '';
            selProf.disabled = false;
        }
    });

    async function atualizarDisciplinas() {
        const turmaId = selTurma.value;
        const set = new Set();
        if (!isAdmin) parseDisciplinas(profile?.disciplinas).forEach(d => set.add(d));
        if (turmaId) {
            let aulas;
            if (isAdmin) {
                const hs = await getDocs(query(collection(db, "horarios"), where("turmaId", "==", turmaId)));
                aulas = hs.docs.map(d => d.data());
            } else {
                aulas = minhasAulas.filter(h => h.turmaId === turmaId);
            }
            aulas.forEach(h => h.disciplina && set.add(h.disciplina));
        }
        const arr = [...set].sort();
        const select = inpDisc;
        if (arr.length === 0) {
            select.innerHTML = '<option value="">Sem disciplinas nesta turma</option>';
            select.disabled = true;
        } else if (arr.length === 1) {
            select.innerHTML = `<option value="${esc(arr[0])}" selected>${esc(arr[0])}</option>`;
            select.disabled = true;
        } else {
            select.innerHTML = '<option value="">Selecione a disciplina...</option>' + 
                               arr.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('');
            select.disabled = false;
        }
    }

    // ---------- Abrir registo ----------
    async function abrir(turmaId, data, disciplina) {
        if (!turmaId || !data || !disciplina) { alert('Seleciona a Turma, a Disciplina e a Data da aula.'); return; }

        const docId = `${turmaId}_${data}_${slug(disciplina)}`;
        const [snap, alunosQs] = await Promise.all([
            getDoc(doc(db, "diarios", docId)),
            getDocs(query(collection(db, "users"), where("role", "==", "aluno"), where("turmaId", "==", turmaId)))
        ]);

        const existente = snap.exists() ? snap.data() : null;
        const alunos = alunosQs.docs.map(d => ({ uid: d.data().uid || d.id, name: d.data().name }));
        // Mantém no registo alunos que já constavam na chamada (ex.: mudaram de turma depois)
        if (existente?.alunos) {
            Object.entries(existente.alunos).forEach(([uid, name]) => { if (!alunos.find(a => a.uid === uid)) alunos.push({ uid, name }); });
        }
        alunos.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        const presencas = {};
        alunos.forEach(a => presencas[a.uid] = existente?.presencas?.[a.uid] || 'P');

        atual = { docId, turmaId, data, disciplina, alunos, presencas, existe: !!existente };

        $('dcTitulo').textContent = `${turmas[turmaId]?.nome || 'Turma'} · ${disciplina} · ${fmtData(data)}`;
        $('dcConteudo').value = existente?.conteudo || '';
        $('dcObs').value = existente?.observacoes || '';
        $('dcEliminar').style.display = existente ? 'inline-block' : 'none';
        if (isAdmin) {
            const sugerido = existente?.professorId
                || (await sugerirProfessor(turmaId, data, disciplina));
            selProf.value = sugerido || selProf.value;
        }
        renderChamada();
        $('dcRegisto').style.display = 'block';
        $('dcRegisto').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Admin: sugere o professor que leciona essa disciplina nessa turma, segundo a grelha
    async function sugerirProfessor(turmaId, data, disciplina) {
        const hs = await getDocs(query(collection(db, "horarios"), where("turmaId", "==", turmaId)));
        const aula = hs.docs.map(d => d.data()).find(h => slug(h.disciplina || '') === slug(disciplina));
        return aula?.professorId || '';
    }

    function renderChamada() {
        const tbody = container.querySelector('#dcChamada tbody');
        if (!atual.alunos.length) {
            tbody.innerHTML = `<tr><td colspan="2"><div class="empty-state"><i class="fa-solid fa-user-slash"></i>Nenhum aluno associado a esta turma.<br><small>Associa alunos à turma em "Gestão de Utilizadores".</small></div></td></tr>`;
        } else {
            tbody.innerHTML = atual.alunos.map(a => {
                const v = atual.presencas[a.uid];
                return `<tr>
                    <td>${esc(a.name)}</td>
                    <td><div class="presence-toggle" data-uid="${esc(a.uid)}">
                        <button type="button" class="p ${v === 'P' ? 'on' : ''}" data-v="P">Presente</button>
                        <button type="button" class="f ${v === 'F' ? 'on' : ''}" data-v="F">Falta</button>
                    </div></td>
                </tr>`;
            }).join('');
        }
        const total = atual.alunos.length;
        const presentes = Object.values(atual.presencas).filter(v => v === 'P').length;
        $('dcResumo').textContent = total ? `— ${presentes}/${total} presentes` : '';
    }

    container.querySelector('#dcChamada').addEventListener('click', e => {
        const btn = e.target.closest('.presence-toggle button');
        if (!btn || !atual) return;
        atual.presencas[btn.parentElement.dataset.uid] = btn.dataset.v;
        renderChamada();
    });

    $('dcTodosP').addEventListener('click', () => {
        if (!atual) return;
        Object.keys(atual.presencas).forEach(k => atual.presencas[k] = 'P');
        renderChamada();
    });

    // ---------- Guardar / Eliminar ----------
    $('dcForm').addEventListener('submit', async e => {
        e.preventDefault();
        if (!atual) return;
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerText = 'A guardar...';

        let professorId = meuUid, professorName = meuNome;
        if (isAdmin && selProf.value) {
            professorId = selProf.value;
            professorName = professores.find(p => p.uid === selProf.value)?.name || '';
        }

        const alunosMap = {};
        atual.alunos.forEach(a => alunosMap[a.uid] = a.name);
        const chamadasMap = {};
        Object.entries(atual.presencas).forEach(([uid, v]) => {
            chamadasMap[uid] = v === 'P' ? 'Presente' : 'Falta';
        });
        const conteudoTexto = $('dcConteudo').value.trim();
        const payload = {
            turmaId: atual.turmaId,
            turmaNome: turmas[atual.turmaId]?.nome || '',
            data: atual.data,
            disciplina: atual.disciplina,
            professorId, professorName,
            conteudo: conteudoTexto,
            sumario: conteudoTexto,
            observacoes: $('dcObs').value.trim(),
            presencas: atual.presencas,
            chamadas: chamadasMap,
            alunos: alunosMap,
            totalAlunos: atual.alunos.length,
            totalPresentes: Object.values(atual.presencas).filter(v => v === 'P').length,
            updatedAt: serverTimestamp()
        };
        if (!atual.existe) payload.createdAt = serverTimestamp();

        try {
            await setDoc(doc(db, "diarios", atual.docId), payload, { merge: true });
            atual.existe = true;
            $('dcEliminar').style.display = 'inline-block';
            alert('Registo do diário guardado com sucesso!');
            carregarHistorico();
        } catch (err) {
            alert('Erro ao guardar o diário: ' + err.message);
        } finally {
            btn.disabled = false; btn.innerText = 'Guardar Registo';
        }
    });

    $('dcEliminar').addEventListener('click', async () => {
        if (!atual?.existe || !confirm('Deseja eliminar este registo do diário?')) return;
        await deleteDoc(doc(db, "diarios", atual.docId));
        $('dcRegisto').style.display = 'none';
        atual = null;
        carregarHistorico();
    });

    // ---------- Histórico ----------
    async function carregarHistorico() {
        const tbody = container.querySelector('#dcHistorico tbody');
        tbody.innerHTML = '<tr><td colspan="6">A carregar...</td></tr>';
        try {
            const filtros = [];
            if (selTurma.value) filtros.push(where("turmaId", "==", selTurma.value));
            if (!isAdmin) filtros.push(where("professorId", "==", meuUid));
            const qs = await getDocs(filtros.length ? query(collection(db, "diarios"), ...filtros) : collection(db, "diarios"));

            const regs = qs.docs.map(d => d.data()).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
            if (!regs.length) {
                tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fa-regular fa-folder-open"></i>Sem registos no diário.</div></td></tr>';
                return;
            }
            tbody.innerHTML = regs.slice(0, 100).map(r => `<tr>
                <td>${fmtData(r.data)}</td>
                <td>${esc(r.turmaNome || turmas[r.turmaId]?.nome || '')}</td>
                <td>${esc(r.disciplina)}</td>
                <td>${esc(r.professorName || '')}</td>
                <td>${r.totalPresentes ?? 0}/${r.totalAlunos ?? 0}</td>
                <td><button type="button" class="edit-btn" title="Abrir registo"
                        data-turma="${esc(r.turmaId)}" data-data="${esc(r.data)}" data-disc="${esc(r.disciplina)}">
                        <i class="fa-solid fa-pen-to-square"></i></button></td>
            </tr>`).join('');
        } catch (err) {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="6">Erro ao carregar o histórico.</td></tr>';
        }
    }

    container.querySelector('#dcHistorico').addEventListener('click', async e => {
        const btn = e.target.closest('.edit-btn');
        if (!btn) return;
        selTurma.value = btn.dataset.turma;
        inpData.value = btn.dataset.data;
        inpDisc.value = btn.dataset.disc;
        await atualizarDisciplinas();
        abrir(btn.dataset.turma, btn.dataset.data, btn.dataset.disc);
    });

    // ---------- Eventos dos filtros ----------
    selTurma.addEventListener('change', () => { atualizarDisciplinas(); carregarHistorico(); $('dcRegisto').style.display = 'none'; });
    $('dcAbrir').addEventListener('click', () => abrir(selTurma.value, inpData.value, inpDisc.value.trim()));

    // Arranque
    (async () => {
        try {
            await Promise.all([carregarTurmas(), carregarProfessores()]);
            await atualizarDisciplinas();
            await carregarHistorico();
        } catch (err) {
            console.error('Erro ao iniciar o Diário de Classe:', err);
        }
    })();

    // Permite ao painel recarregar turmas quando são criadas/alteradas noutras abas
    return { refresh: async () => { await carregarTurmas(); await atualizarDisciplinas(); await carregarHistorico(); } };
}
