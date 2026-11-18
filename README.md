# 🎓 Sistema Colégio Veras — Portal Institucional & Gestão Acadêmica

Plataforma web completa do **Colégio Veras** (Fortaleza - CE), integrando o **Site Institucional** aberto ao público e o **Sistema de Gestão Escolar** com controle de acesso baseado em perfis (**RBAC**) e sincronização em tempo real via **Firebase Authentication** e **Cloud Firestore**.

---

## ✨ Visão Geral e Arquitetura

O projeto foi desenhado sob três pilares fundamentais documentados em [`requisitos/`](./requisitos):

1. **Única Fonte de Verdade (Cloud Firestore):** Dados não são duplicados; todas as entidades (usuários, turmas, horários, diários, notas e atividades) relacionam-se por identificadores únicos (`UID`, `turmaId`, `professorId`, `vinculoAlunoId`).
2. **Integridade Relacional:** Campos que referenciam chaves relacionais (como *Turma*, *Disciplina* e *Bimestre*) utilizam exclusivamente menus suspensos (`<select>`) populados dinamicamente conforme o contexto e as permissões do usuário autenticado.
3. **Estética Institucional Premium:** Interface responsiva construída com a paleta institucional do Colégio Veras (`#0d2b56` azul profundo, cinza ardósia e realces semânticos), cards com *soft shadows*, bordas arredondadas (`16px`) e navegação fluida por abas.

---

## 🔐 Perfis de Acesso (RBAC)

O roteamento de autenticação ([`portais.html`](./portais.html)) valida as credenciais no Firebase Auth e consulta o perfil do usuário na coleção `users` do Firestore:

### 1. Coordenador (`role: 'coordenador'`)
> **Regra de Segurança:** O sistema **nunca** cria contas de coordenador pela interface web. O formulário administrativo gera estritamente contas `professor`, `aluno` ou `pais`. A elevação para `coordenador` é exclusiva do administrador diretamente no console do Firestore.

- **Dashboard Global:** Indicadores gerais, gráficos de assiduidade, matrículas e alertas de pendências.
- **Criar Nova Turma:** Formulário dedicado ao cadastro de turmas e definição de turno (*Manhã*, *Tarde* ou *Noite*).
- **Hub de Turmas e Disciplinas:**
  - *Turmas Existentes:* Gestão e alocação de disciplinas/professores.
  - *Lista de Alunos por Turma:* Visualização interativa com acesso ao **Perfil Detalhado do Aluno** (dados cadastrais, telefone, endereço, métricas de presença) e atalho direto para o **Boletim Escolar**.
  - *Relatórios Escolares (Auditoria):* Consulta integral aos diários de classe e lançamentos de toda a escola.
- **Horários:** Gestão completa da grade semanal por turma e turno.
- **Gestão de Usuários:** Cadastro de Professores, Alunos (com coleta obrigatória de `telefone` e `endereco`) e Pais/Responsáveis.

### 2. Professor (`role: 'professor'`)
- **Escopo Isolado:** Enxerga exclusivamente as turmas, disciplinas e horários onde seu `UID` está alocado.
- **Diário de Classe:** Registro de chamada (*Presente* / *Falta*), sumário de conteúdo lecionado e observações.
- **Caderneta de Notas:** Lançamento e edição de avaliações e notas por bimestre.
- **Gestão de Atividades:** Criação de tarefas de **Sala** (`sala`) e **Casa** (`casa`) com marcação individual de conclusão por aluno (`alunosConcluidos`).
- **Grade Horária:** Visualização *readonly* da sua própria grade semanal.

### 3. Aluno (`role: 'aluno'`)
- **Acesso Somente Leitura (Foco em Transparência):**
  - **Dashboard do Aluno:** Resumo de frequência/faltas calculado a partir dos diários da turma, progresso de atividades (*ex.: `1/6` concluídas*) e próximas aulas.
  - **Boletim Escolar:** Consulta de notas e situação por disciplina e bimestre.
  - **Grade Horária:** Visualização do horário semanal da sua turma.

### 4. Pais / Responsáveis (`role: 'pais'`)
- **Visão Espelho:** Acompanhamento somente leitura (Boletim, Frequência e Horário) puxando dinamicamente os dados do(s) filho(s) através do vínculo relacional (`vinculoAlunoId`).

---

## 🗄️ Estrutura de Coleções (Cloud Firestore)

| Coleção | Descrição e Principais Campos |
| :--- | :--- |
| `users` | Perfis de usuários (`uid`, `name`, `email`, `role`, `turma`, `telefone`, `endereco`, `disciplinas`, `vinculoAlunoId`). |
| `turmas` | Turmas cadastradas (`nome`, `anoLetivo`, `turno`, `disciplinas`). |
| `horarios` | Alocação semanal de aulas (`turmaId`, `dia`, `hora`, `disciplina`, `professorId`, `professorName`). |
| `diarios` / `diario` | Registros de aulas e frequência (`turmaId`, `disciplina`, `data`, `professorId`, `conteudo`, `presencas`). |
| `notas` | Avaliações e notas bimestrais por aluno e disciplina (`alunoId`, `turmaId`, `disciplina`, `bimestre`, `nota`). |
| `atividades` | Tarefas escolares para gamificação e acompanhamento (`turma`, `disciplina`, `professorId`, `tipo` [`'casa'` \| `'sala'`], `descricao`, `dataCriacao`, `alunosConcluidos` `[UIDs]`). |

---

## 📂 Estrutura do Repositório

```text
├── assets/
│   └── images/                  # Logotipo e imagens institucionais
├── css/
│   └── styles.css               # Estilização global e design system institucional
├── js/
│   ├── firebase-config.js       # Inicialização do Firebase App, Auth e Firestore
│   ├── auth-utils.js            # Utilitários de sessão, RBAC e blocos de horários por turno
│   ├── diario.js                # Módulo compartilhado do Diário de Classe (Admin e Docente)
│   └── main.js                  # Interações gerais das páginas institucionais
├── requisitos/
│   ├── 01_design.md             # Diretrizes de UI/UX e Estética Premium
│   ├── 02_banco_dados_rbac.md   # Regras de negócio, coleções e limites por perfil (RBAC)
│   └── 03_regras_desenvolvimento.md # Padrões de integridade relacional e arquitetura dos painéis
├── index.html                   # Página inicial institucional
├── sobre.html                   # História e valores do Colégio Veras
├── curriculo.html               # Proposta pedagógica e níveis de ensino
├── admissoes.html               # Informações de matrícula e admissão
├── calendario.html              # Calendário acadêmico
├── equipe.html                  # Corpo docente e liderança escolar
├── noticias.html                # Mural de notícias e comunicados
├── politicas.html               # Políticas e diretrizes institucionais
├── contato.html                 # Canais de atendimento e localização
├── portais.html                 # Gateway de autenticação (Aluno, Pais, Professor e Coordenador)
├── painel_coordenador.html      # Painel administrativo e pedagógico da Coordenação
├── painel_professor.html        # Portal produtivo do Docente
├── painel_aluno.html            # Portal de consulta do Aluno
├── firebase.json                # Configuração de deploy do Firebase Hosting
└── package.json                 # Scripts de desenvolvimento local (live-server)
```

---

## 🚀 Tecnologias Utilizadas

- **Front-end:** HTML5 Semântico, CSS3 (Custom Properties, Flexbox, CSS Grid), JavaScript (ES6+ Modules)
- **Back-end / BaaS:** Google Firebase (Authentication & Cloud Firestore SDK v10.4.0)
- **Hospedagem:** Firebase Hosting (`colegioveras-719bc`)
- **Bibliotecas de UI:** Font Awesome 6.4, Chart.js, Google Fonts (*Outfit* & *Playfair Display*)

---

## 🛠️ Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (v18 ou superior recomendado)
- [Firebase CLI](https://firebase.google.com/docs/cli) (opcional, para deploy)

### Passo a passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/miguelmvm/Sistema_Colegio_Veras.git
   cd Sistema_Colegio_Veras
   ```

2. **Instale as dependências de desenvolvimento:**
   ```bash
   npm install
   ```

3. **Inicie o servidor local com Live Reload:**
   ```bash
   npm run dev
   ```

---

## ☁️ Deploy no Firebase Hosting

Para publicar atualizações no ambiente de produção do Firebase Hosting:

```bash
firebase login
firebase deploy --only hosting
```

---

<p align="center">
  <strong>Colégio Veras</strong> • <em>Iluminando Mentes, Construindo Futuros.</em>
</p>
