# Finance+ - Gestor Financeiro Pessoal

Aplicativo de controle financeiro pessoal desenvolvido com React, TypeScript e Vite. Foco em privacidade (dados locais), performance e usabilidade.

## 🚀 Como Executar

Este projeto requer o [Node.js](https://nodejs.org/) instalado em sua máquina.

1.  **Instalar dependências**:
    Abra o terminal na pasta do projeto e execute:
    ```bash
    npm install
    ```

2.  **Iniciar o servidor de desenvolvimento**:
    ```bash
    npm run dev
    ```

3.  **Acessar**:
    Abra seu navegador em [http://localhost:5173](http://localhost:5173)

## 📱 Funcionalidades

- **Dashboard**: Visão geral de saldo, receitas, despesas e gráficos interativos.
- **Login**: Acesso protegido por senha (admin).
- **Lançamentos**: Registro de entradas e saídas com categorias, fornecedores e filtros avançados.
- **Relatórios**: Análise detalhada por período, gráficos de pizza e extrato exportável (CSV/Impressão).
- **Gestão**: Cadastro personalizado de categorias, fornecedores e métodos de pagamento.
- **Privacidade**: Todos os dados ficam salvos apenas no seu navegador (`localStorage`).
- **Backup**: Importação e Exportação de dados via JSON.

## 🛠️ Tecnologias

- React 18
- TypeScript
- Vite
- Recharts (Gráficos)
- Lucide React (Ícones)
- Date-fns (Manipulação de datas)
- CSS Modules / Vanilla CSS Variables

## 🔐 Acesso

Ao abrir o aplicativo, será solicitada uma senha.
- **Senha Padrão**: `admin`

## 🧪 Dados de Exemplo

Ao iniciar o app pela primeira vez, vá em **Configurações > Gerar Dados de Demonstração** para popular o aplicativo com dados fictícios e testar as funcionalidades.
