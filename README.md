# BuildPointIdAnexos

# Documento de Especificação de Requisitos — BuildPoint ID
### Plataforma de Gestão de Jornada de Trabalho na Construção Civil

---

## 1. Introdução

* **Objetivo do Documento:** Este documento especifica os requisitos funcionais e não funcionais do sistema BuildPoint ID. Ele serve como base para o desenvolvimento do MVP (Produto Mínimo Viável) planejado pela equipe (Emyliano, João Gabriel, Kelvin e Lucas Galindo), garantindo o alinhamento técnico e jurídico do controle de ponto.
* **Escopo do Sistema:** O BuildPoint ID é um sistema de controle de ponto eletrônico descentralizado voltado para canteiros de obras da construção civil. O sistema engloba um painel de controle Web corporativo e aplicativos móveis para validação de presença por reconhecimento facial e cerca virtual (Geofencing) de 5 metros. Não fazem parte do escopo deste MVP módulos de processamento de folha de pagamento financeira completa, emissão de holerites ou gestão de benefícios (vale-transporte/alimentação).

---

## 2. Descrição Geral

* **Perspectiva do Produto:** O produto operará em um modelo híbrido. Haverá um painel Web centralizado baseado em modelo hierárquico para o gerenciamento de múltiplas obras, enquanto a marcação de ponto e configurações locais de campo serão feitas por aplicativos móveis (desenvolvidos em React Native ou Flutter) alimentados por um backend em Node.js e banco de dados Firebase.
* **Funções do Produto:**
  * Gestão de obras por geolocalização e alocação de gerentes de campo.
  * Cadastramento de trabalhadores operacionais (peões).
  * Criação de cerca virtual de atuação (raio do ponto).
  * Registro de ponto eletrônico por biometria facial e checagem de perímetro GPS.
  * Consulta a relatórios de dias trabalhados e frequência.
* **Características dos Usuários:**
  * **Dono:** Usuário administrativo de escritório. Precisa de uma visão macro (dashboard) sobre faturamento, custos e frequência global.
  * **Gerente da Obra:** Usuário de campo, responsável por operacionalizar o canteiro, gerenciar o raio físico do ponto e cadastrar a equipe local.
  * **Peão (Operário/Trabalhador Braçal):** Usuário final que frequentemente apresenta desgaste nas impressões digitais. Requer uma interface mobile extremamente direta e à prova de falhas para registrar seu ponto e acompanhar seus dias trabalhados.
* **Restrições Gerais:** O sistema possui uma restrição legal obrigatória de conformidade com as diretrizes da Portaria 671 do MTE (Ministério do Trabalho e Emprego) e com as regras de proteção a dados biométricos sensíveis regulamentadas pela LGPD.

---

## 3. Atores do Sistema

* **Dono (Administrador Master):** Tem acesso à plataforma Web para cadastrar as obras, associar os gerentes e acompanhar o dashboard gerencial.
* **Gerente (Administrador de Campo):** Acessa o sistema para gerenciar o canteiro de obras local, configurar a cerca virtual (raio do ponto), cadastrar os peões e supervisionar as batidas de ponto locais.
* **Peão (Trabalhador Operacional):** Usuário final do aplicativo móvel, interage batendo ponto por reconhecimento facial e acompanhando os dias trabalhados no mês.
* **API do Motor de Face ID:** Sistema integrado responsável por processar os vetores da imagem da câmera e validar a identidade do trabalhador.

---

## 4. Requisitos do Sistema

### 4.1. Requisitos Funcionais (RF)

| ID | Descrição do Requisito | Ator Relacionado | Prioridade |
| :--- | :--- | :--- | :--- |
| **RF01** | Permir ao Dono o cadastro, edição e exclusão de canteiros de obras. | Dono | Essencial |
| **RF02** | Permitir ao Dono cadastrar Gerentes de Obra e vinculá-los a obras específicas. | Dono | Essencial |
| **RF03** | Disponibilizar um painel visual (Dashboard) com métricas de custos e frequência geral das obras para o Dono. | Dono | Importante |
| **RF04** | Permitir ao Gerente delimitar geograficamente o raio/perímetro (cerca virtual de 5m) permitido para a batida de ponto daquela obra. | Gerente | Essencial |
| **RF05** | Permitir ao Gerente cadastrar os dados e a face inicial (enrolment) do Peão no canteiro de obras. | Gerente | Essencial |
| **RF06** | Permitir que o Gerente efetue ou valide a batida de ponto do peão em casos de contingência operacional. | Gerente | Importante |
| **RF07** | Permitir ao Peão realizar a marcação de ponto utilizando reconhecimento facial (Face ID) pelo aplicativo móvel. | Peão | Essencial |
| **RF08** | Coletar e validar a posição geográfica (GPS) do Peão no exato momento da batida de ponto, bloqueando o registro caso ele esteja fora do raio da obra. | Peão / Sistema | Essencial |
| **RF09** | Permitir ao Peão visualizar seu histórico de dias trabalhados e espelho de ponto no aplicativo móvel. | Peão | Essencial |

### 4.2. Requisitos Não Funcionais (RNF)

| ID | Categoria | Descrição do Requisito |
| :--- | :--- | :--- |
| **RNF01** | Segurança Jurídica | O motor de registro e armazenamento de logs das marcações de ponto deve seguir rigorosamente os padrões de inviolabilidade exigidos pela Portaria 671 do MTE. |
| **RNF02** | Desempenho / IA | O algoritmo de reconhecimento facial (Face ID) deve conseguir autenticar o operário em até 3 segundos, sendo adaptável a variações de luminosidade do canteiro e ao uso parcial de EPIs (como capacetes e óculos de proteção). |
| **RNF03** | Confiabilidade | O Geofencing integrado deve validar a cerca virtual com margem de precisão estrita de 5 metros para evitar fraudes de localização. |
| **RNF04** | Arquitetura | O backend estruturado em Node.js com Firebase deve garantir sincronização em tempo real das marcações de ponto, mantendo os dados salvos localmente (offline) no app caso falte internet no canteiro, transmitindo assim que a conexão retornar. |
| **RNF05** | Usabilidade | A interface de batida de ponto do Peão deve possuir no máximo 2 clicks para ser concluída, considerando o perfil de baixa familiaridade tecnológica de parte dos usuários. |

### 4.3. Requisitos de Interface (RI)

| ID | Descrição do Requisito |
| :--- | :--- |
| **RI01** | A tela de batida de ponto do aplicativo do Peão deve possuir um botão central de destaque em cor contrastante (ex: verde) para iniciar a câmera. |
| **RI02** | O aplicativo móvel deve exibir um indicador visual claro (ícone de satélite verde/vermelho) mostrando se o sinal de GPS do usuário está preciso e dentro do raio antes de permitir o clique. |
| **RI03** | O Painel Web do Dono deve apresentar os indicadores de frequência e custos em formato de gráficos de pizza ou barras interativas, utilizando um design limpo e responsivo. |

### 4.4. Requisitos de Segurança (RS)

| ID | Descrição do Requisito |
| :--- | :--- |
| **RS01** | O sistema deve implementar controle de acesso baseado em papéis (RBAC), impedindo que Peões ou Gerentes acessem o dashboard financeiro do Dono. |
| **RS02** | As fotos capturadas para o Face ID não devem ser salvas como imagens puras no banco de dados; o sistema deve armazenar apenas o código hash/vetorial criptografado da face, atendendo à LGPD. |
| **RS03** | O sistema deve gerar um log de auditoria imutável para cada batida de ponto, registrando: ID do trabalhador, data, horário exato, coordenadas de GPS e nível de confiança do Face ID, impedindo qualquer alteração manual posterior. |

### 4.5. Requisitos de Testes (RT)

| ID | Descrição do Requisito |
| :--- | :--- |
| **RT01** | Devem ser realizados testes de estresse para garantir que o backend em Node.js/Firebase suporte requisições simultâneas de batida de ponto nos horários de pico (ex: entrada do turno às 07:00) sem apresentar lentidão. |
| **RT02** | Devem ser executados testes de campo em condições adversas de luminosidade (sol forte e fim de tarde) e com uso de EPIs (capacete e óculos) para homologar a taxa de acerto do motor de Face ID. |
| **RT03** | Devem ser feitos testes de simulação de falso GPS (spoofing) para certificar que o aplicativo bloqueie tentativas de burlar a cerca virtual de 5 metros. |

---

## 5. Casos de Uso (UC)

### UC01: Cadastrar Obra e Vincular Gerente
* **Ator Principal:** Dono
* **Pré-condições:** O Dono deve estar autenticado no painel administrativo Web.
* **Fluxo Principal:**
  1. O Dono acessa o menu "Obras" no painel Web.
  2. O Dono clica no botão "Cadastrar Nova Obra".
  3. O sistema exibe um formulário solicitando o nome da obra, endereço e coordenadas centrais.
  4. O Dono preenche os dados e seleciona um Gerente na lista de usuários para vinculá-lo àquela obra.
  5. O Dono clica em "Salvar".
  6. O sistema valida os dados, armazena as informações no Firebase e exibe uma mensagem de sucesso.
* **Fluxos Alternativos / Exceções:**
  * **4.a. O Gerente desejado não está cadastrado:**
    1. O Dono clica em "Adicionar Novo Gerente" dentro do próprio formulário.
    2. O sistema abre uma janela para inserir Nome, E-mail e CPF do Gerente.
    3. O Dono preenche, o sistema salva o perfil do Gerente e retorna ao cadastro da obra com o gerente já selecionado.
  * **6.a. Dados obrigatórios em branco:**
    1. O sistema impede o salvamento, destaca os campos vazios em vermelho e solicita o preenchimento correto.

### UC02: Configurar Raio de Ponto (Geofencing)
* **Ator Principal:** Gerente
* **Pré-condições:** O Gerente deve estar logado no aplicativo móvel e fisicamente presente no canteiro de obras.
* **Fluxo Principal:**
  1. O Gerente acessa o menu "Configurações da Obra" no aplicativo.
  2. O Gerente seleciona a opção "Registrar Raio de Ponto".
  3. O sistema solicita permissão de localização e captura as coordenadas de latitude e longitude atuais do dispositivo via GPS.
  4. O Gerente confirma a marcação do ponto central e define o raio da cerca virtual (fixado em 5 metros padrão).
  5. O Gerente clica em "Salvar Perímetro".
  6. O sistema atualiza a cerca geográfica da obra no banco de dados e emite um alerta de sucesso.
* **Fluxos Alternativos / Exceções:**
  * **3.a. Sinal de GPS fraco ou desativado:**
    1. O sistema identifica que a precisão do GPS está baixa (acima de 10 metros de margem de erro) ou desativada.
    2. O sistema exibe uma mensagem solicitando que o Gerente ative o GPS em alta precisão ou vá para um local a céu aberto.
    3. O caso de uso retorna ao passo 3.

### UC03: Cadastrar Peão com Biometria Facial
* **Ator Principal:** Gerente
* **Pré-condições:** O Gerente deve estar autenticado no aplicativo móvel.
* **Fluxo Principal:**
  1. O Gerente acessa a aba "Trabalhadores" e clica em "Cadastrar Peão".
  2. O Gerente insere o Nome, CPF e Cargo do operário.
  3. O Gerente clica em "Capturar Biometria Facial".
  4. O sistema abre a câmera frontal/traseira do dispositivo móvel.
  5. O Gerente enquadra o rosto do peão e captura a foto.
  6. O sistema processa a imagem, extrai os vetores faciais (mapeamento matemático) e valida a qualidade da imagem.
  7. O Gerente clica em "Concluir Cadastro".
  8. O sistema salva os dados estruturados e a biometria no Firebase.
* **Fluxos Alternativos / Exceções:**
  * **6.a. Iluminação inadequada ou uso incorreto de EPI:**
    1. O motor de Face ID detecta que o rosto está muito escuro ou obstruído de forma que impossibilita o mapeamento.
    2. O sistema exibe um aviso: "Rosto obstruído ou pouca luz. Por favor, remova óculos escuros/capacetes temporariamente e tente novamente".
    3. O caso de uso retorna ao passo 4.

### UC04: Registrar Ponto Eletrônico (Bater Ponto)
* **Ator Principal:** Peão (ou Gerente em caso de contingência)
* **Pré-condições:** O Peão deve estar cadastrado no sistema e com o aplicativo aberto no smartphone.
* **Fluxo Principal:**
  1. O Peão clica no botão principal "Bater Ponto".
  2. O sistema captura a geolocalização do aparelho e valida que o Peão está dentro do raio de 5 metros da cerca virtual da obra.
  3. O sistema abre a câmera frontal e solicita o posicionamento do rosto.
  4. O Peão olha para a câmera; o sistema captura a imagem de forma automatizada.
  5. O algoritmo processa o reconhecimento facial e confirma a identidade do Peão em até 3 segundos.
  6. O sistema gera o bilhete de ponto, salva o log imutável de acordo com a Portaria 671 do MTE e exibe uma tela verde de sucesso com o horário marcado.
* **Fluxos Alternativos / Exceções:**
  * **2.a. Peão fora do raio permitido da obra (Fraude/Erro de Localização):**
    1. O sistema detecta que o trabalhador está fora dos 5 metros da cerca da obra.
    2. O sistema blocks a operação e exibe a mensagem: "Marcação não permitida. Você está fora do perímetro da obra". O ponto não é registrado.
  * **5.a. Falha no Reconhecimento Facial (Rosto não confere):**
    1. O sistema não atinge a porcentagem mínima de confiança na leitura da face.
    2. O sistema permite mais 2 tentativas automáticas. Se persistir, exibe a mensagem: "Identidade não confirmada. Procure o seu Gerente para registrar o ponto em contingência".
  * **6.a. Dispositivo sem conexão com a internet (Modo Offline):**
    1. O sistema valida o GPS e a face localmente, grava o registro de ponto criptografado na memória interna do celular (armazenamento local do app).
    2. Exibe o aviso: "Ponto registrado offline. O registro será sincronizado assim que houver conexão".

### UC05: Consultar Histórico de Dias Trabalhados
* **Ator Principal:** Peão
* **Pré-condições:** O Peão deve estar logado no aplicativo móvel.
* **Fluxo Principal:**
  1. O Peão acessa o menu lateral e clica em "Dias Trabalhados".
  2. O sistema faz uma requisição ao banco de dados buscando o histórico de pontos daquele CPF no mês vigente.
  3. O sistema renderiza na tela uma listagem organizada por data, contendo os horários de entrada, saídas e o total de horas trabalhadas em cada dia.
  4. O Peão visualiza as informações na interface de forma simples.
* **Fluxos Alternativos / Exceções:**
  * **2.a. Nenhum registro encontrado:**
    1. Se for o primeiro mês do peão ou ele não tiver marcações, o sistema exibe uma tela limpa com a mensagem: "Nenhum registro de ponto encontrado para o período selecionado".