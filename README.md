# Controle Financeiro Pessoal

Sistema simples para controlar entradas, saídas e saldo no dia a dia — 100% no navegador, sem backend, sem login e sem banco de dados.

Ideal para quem tem salário fixo, freelas e despesas fixas/variáveis e quer saber rápido: quanto entrou, quanto saiu, onde gastou e quanto sobrou.

## Funcionalidades

- Dashboard com saldo do mês, entradas, saídas, economia e saldo acumulado
- Navegação por mês
- Lançamentos (criar, editar, excluir) com categorias
- Busca e filtros por tipo, categoria e período
- Gráficos: entradas × saídas, gastos por categoria, evolução do saldo
- Resumo “Para onde meu dinheiro está indo?”
- Entradas e despesas recorrentes (geração simples no mês)
- Meta de economia com barra de progresso
- Resumo anual com tabela e gráfico
- Dark mode / light mode
- Exportar/importar backup JSON
- Exportar lançamentos em CSV
- Dados de demonstração e limpeza total
- Persistência via `localStorage`
- Responsivo (desktop, tablet e celular)

## Tecnologias

- HTML5
- CSS3
- JavaScript (vanilla, modular)
- [Chart.js](https://www.chartjs.org/) via CDN (gráficos)
- Hospedagem pronta para GitHub Pages (sem build)

## Estrutura

```text
/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── storage.js
│   ├── transactions.js
│   ├── dashboard.js
│   ├── charts.js
│   └── utils.js
├── .nojekyll
└── README.md
```

## Acesso

O site no GitHub Pages tem uma tela de login. A senha **não** fica no repositório (só um hash). Guarde o usuário/senha em local seguro — não commitamos credenciais.

## Como executar

Não precisa instalar dependências.

1. Clone ou baixe este repositório
2. Abra o arquivo `index.html` no navegador  
   **ou** sirva a pasta com um servidor estático simples:

```bash
# Python
python -m http.server 5500

# Node (se tiver npx)
npx serve .
```

3. Acesse `http://localhost:5500`

> Dica: alguns navegadores restringem módulos/recursos em `file://`. Preferível usar um servidor local.

## GitHub Pages

1. Crie um repositório no GitHub e envie estes arquivos para a branch `main`
2. Em **Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: `main` / pasta `/ (root)`
3. Aguarde alguns minutos e abra a URL gerada  
   Ex.: `https://seu-usuario.github.io/controle-financeiro/`

Como o projeto usa caminhos relativos e não tem etapa de build, não é necessário configurar `base` de Vite/React.

### Atualizar o projeto

```bash
git add .
git commit -m "Atualiza controle financeiro"
git push
```

O GitHub Pages republica automaticamente após o push.

## Armazenamento

Os dados ficam **somente no navegador**, na chave `controle-financeiro-v1` do `localStorage`.

- Não são enviados a nenhum servidor
- Limpar dados do site/navegador apaga as informações
- Trocar de computador ou navegador não leva os dados automaticamente — use o backup

## Backup

Em **Configurações**:

1. **Exportar backup** — baixa um arquivo `.json` com tudo
2. **Importar backup** — restaura a partir do `.json` (substitui os dados atuais)
3. **Exportar CSV** — lança os lançamentos para abrir no Excel/Google Sheets

Faça backup com frequência (por exemplo, todo fim de mês).

## Como usar (fluxo rápido)

1. Abra o app e escolha começar do zero ou carregar a demonstração
2. No dashboard, veja saldo, entradas e saídas do mês
3. Clique em **+ Novo lançamento** para registrar salário, freela ou despesa
4. Use as setas ou o seletor para trocar de mês
5. Em **Fixos**, cadastre salário e outras entradas/despesas que se repetem todo mês
6. Em **Lançamentos**, registre freelas e gastos variáveis
7. Em **Resumo anual**, compare o ano inteiro
8. Em **Configurações**, defina a meta e exporte o backup

## Moeda

Valores sempre em **Real brasileiro (BRL)**, formatados como `R$ 1.250,00`.

## Licença

Uso pessoal livre. Faça o fork e adapte como quiser.
