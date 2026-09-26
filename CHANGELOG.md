# Changelog

## 0.1.9

- Corrige a criação de sessões pelo Explorer para persistir o `cwd` real da pasta selecionada e permitir encontrá-las pelo filtro.

## 0.1.8

- Exibe a pasta de cada sessão ao lado do nome no painel.
- Corrige o comando de filtro por pasta no menu contextual do Explorer e força a atualização da lista.

## 0.1.7

- Vincula “Nova sessão nesta pasta” à pasta selecionada adicionando-a como raiz do workspace antes de abrir o painel nativo do Codex.

## 0.1.6

- Corrige o loop de erro ao criar uma nova sessão pelo menu do Explorer usando o novo painel nativo do Codex.

## 0.1.5

- Corrige a abertura de novas sessões no editor nativo do Codex para evitar o estado de carregamento contínuo.

## 0.1.4

- Desfaz a árvore adicional de workspaces/pastas no painel e adiciona as ações ao menu de contexto das pastas do Explorer.

## 0.1.2

- Adiciona ações inline para excluir e mover sessões para outra pasta.
- Adiciona o botão com ícone de borracha para limpar o filtro e exibir todas as sessões.

## 0.1.1

- Corrige a abertura de sessões na janela oficial do Codex e o acompanhamento da pasta ativa no Explorer.

## 0.1.0

- Painel lateral de sessões agrupadas por recência.
- Filtro por workspace, pasta exata ou árvore de subpastas.
- Integração com o menu de contexto do Explorer.
- Abertura de sessões na janela oficial do Codex.
- Atualização automática e detalhes da sessão.
- Filtro acompanha a pasta do arquivo ativo no Explorer e sessões abrem na janela oficial do Codex.
