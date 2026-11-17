# REQUISITOS DE BANCO DE DADOS E ACESSOS (RBAC)
- Arquitetura: 'Única Fonte de Verdade' (Firestore). Não duplicar dados; usar IDs relacionais (ex: vinculoAlunoId).

## PERMISSÕES E LIMITES POR PERFIL (ROLES):

1. Coordenador (Admin)
- IMPORTANTE: O sistema NUNCA cria novos coordenadores pela interface. O painel de criação gera estritamente contas com role: 'professor', 'aluno' ou 'pais'. A elevação para 'coordenador' é uma ação manual e exclusiva do administrador direto no console do Firestore.
- Acesso total e irrestrito.
- Dashboard global (gráficos de assiduidade, matrículas, alertas de pendências).
- Gestão (CRUD): Pode criar/editar todos os usuários (Alunos, Professores, Pais), Turmas, Disciplinas e Grade de Horários.
- Auditoria: Acesso total aos relatórios e diários de toda a escola.

2. Professor (Foco em Produtividade)
- Acesso restrito e isolado: SÓ enxerga turmas, disciplinas e horários onde o seu UID está alocado.
- Diário de Classe: Pode registrar presenças/faltas e sumários (salva na coleção 'diarios').
- Caderneta: Pode lançar avaliações e notas.
- Horário: Apenas visualização da sua própria grade (readonly).

3. Aluno (Foco em Transparência)
- Acesso Somente Leitura. Não edita nada.
- Dashboard resumo (alertas de faltas, próximas aulas).
- Visualiza o próprio Boletim Escolar (notas/faltas) e sua própria Grade Horária.

4. Pais / Responsáveis (Foco em Acompanhamento)
- Visão "Espelho": Acesso idêntico ao do Aluno (Boletim, Faltas, Horário), mas os dados são puxados dinamicamente lendo o ID do filho (vinculoAlunoId).
- Múltiplos Vínculos: Pode alternar a visualização se tiver mais de um filho cadastrado.

## ESTRUTURA DE DADOS (USERS)
- **Novos Campos Obrigatórios para Alunos:** Ao criar uma conta com `role: 'aluno'`, o sistema DEVE coletar e salvar os campos `telefone` e `endereco`. O campo `pais` (responsáveis) ficará preparado estruturalmente para vinculação futura.
- **Fluxo de UX - Perfil do Aluno:** Na "Lista de Alunos por Turma" do Coordenador, os alunos devem ser clicáveis. O clique deve abrir o "Perfil Detalhado do Aluno" exibindo seus dados cadastrais, métricas de presença e um botão de acesso ao "Boletim Escolar" (que fará a leitura da coleção `notas`).

## ESTRUTURA DE DADOS: COLEÇÃO `atividades`
- **Conceito:** Armazena tarefas criadas pelos professores para gamificação e acompanhamento.
- **Campos Obrigatórios:** 
  - `turma` (string - ID relacional)
  - `disciplina` (string)
  - `professorId` (string - UID do criador)
  - `tipo` (string - restrito a 'casa' ou 'sala')
  - `descricao` (texto da atividade)
  - `dataCriacao` (timestamp)
  - `alunosConcluidos` (array de strings - contém os UIDs dos alunos que já tiveram a tarefa marcada como feita pelo professor).
- **Regras RBAC:**
  - **Professor:** Pode criar atividades e dar o "check" (adicionando o UID do aluno no array `alunosConcluidos`).
  - **Aluno/Pais:** Acesso SOMENTE LEITURA. Lêem as atividades da sua respectiva `turma` e verificam se o seu próprio UID está no array para calcular as frações (ex: 1/6).