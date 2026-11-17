/goals

A partir de agora, a arquitetura e as regras do projeto estão documentadas na pasta local `requisitos/`. Leia os arquivos silenciosamente antes de qualquer ação.

Objetivo Atual (Módulo 4 - Fase 2): Conectar o Dashboard do Aluno ao Firestore.
O esqueleto visual já está pronto. Preciso que crie as queries JavaScript no painel do aluno para ler a coleção `diarios`. 
- Filtre pelo `turmaId` do aluno.
- Calcule quantas faltas o ID deste aluno possui dentro dos diários.
- Injete o número real de faltas no widget do Dashboard.
- Injete o Nome e a Turma no topo da página.
- Formulário de Credenciais: É estritamente proibido existir uma checkbox de "Permissões de Coordenador". Qualquer submissão do tipo "Professor" deve ter a variável role chumbada como 'professor' no código JavaScript, sem exceções.
- **Integridade de Dados (Inputs Relacionais):** É estritamente proibido utilizar campos de digitação livre (`<input type="text">`) para chaves relacionais, como "Disciplina", "Turma" ou "Bimestre". Estes campos DEVEM ser sempre menus suspensos (`<select>`) populados dinamicamente com os dados restritos do utilizador logado ou da base de dados. Isso previne erros de digitação e garante a integridade da Única Fonte de Verdade.

Respeite estritamente os arquivos de design e de RBAC. Faça a integração e confirme quando o número de faltas estiver aparecendo em tela.
- **Arquitetura do Painel do Coordenador:** 
  A navegação lateral deve ser rigorosamente estruturada da seguinte forma:
  1. "Dashboard": Visão geral e alertas.
  2. "Criar Nova Turma": Contém EXCLUSIVAMENTE o formulário para adicionar novas turmas. Nenhuma listagem deve existir aqui.
  3. "Turmas e Disciplinas": Funciona como um "Hub" de gestão. Ao entrar nesta aba, o ecrã deve apresentar um sub-menu (sub-abas) para alternar a visualização entre três páginas internas: "Turmas Existentes", "Lista de Alunos por Turma" e "Relatórios Escolares (Auditoria)".
  4. "Horários": Gestão da grelha semanal.