# Terras de Aurora (versão 0.3)

RPG 2D de navegador no estilo dos MMORPGs clássicos, spin-off da **Ascensão do Cavaleiro** (`../jogo-cavaleiro/`). Usa os mesmos heróis, monstros e o Bafome, agora em mapas ligados por portais, com níveis de base e de classe, atributos, habilidades, inventário e loja.

Feito com **Phaser 3 + TypeScript + Vite**.

## Como rodar

```bash
cd jogo-rpg
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/index.html (um arquivo só, com tudo dentro)
```

O `npm run build` também gera `dist/artefato.html`, a mesma página sem as tags `<html>`/`<head>`/`<body>`, usada para publicar como artefato.

## Controles

| Ação | Teclado e mouse | Celular |
|---|---|---|
| Andar | clicar no chão, ou WASD/setas | tocar no chão |
| Atacar | clicar no monstro (ataca sem parar) · Espaço ataca o mais perto | tocar no monstro |
| Habilidades e itens | teclas 1 a 8 | barra de atalhos |
| Status / Itens / Habilidades | C / I / K | botões da janela de informações |
| Sentar (regenera 2x) | X | botão Sentar |
| Caça automática | Z ou botão AUTO | botão AUTO |
| Gerenciador de habilidades | G ou botão Ajustes | botão Ajustes |
| Fechar janela | Esc | × |

## Desempenho (0.3)

Medido com o mesmo roteiro antes e depois (caça automática de Mago e de Espadachim, 1280×760):

| | antes | depois |
|---|---|---|
| Tempo médio por quadro | 32–33 ms | 22–24 ms |
| Pior quadro (p99) | 50 ms | 33 ms |
| Lógica do jogo por quadro | 0,42 ms | 0,16 ms |
| Travadas longas (mais de 50 ms) | 3 em 12 s | nenhuma |
| Trocar de mapa | 470–560 ms | 18–48 ms |

O que mudou, sem mexer no visual:
- **Mapas em cache e desenhados aos poucos:** cada mapa é desenhado uma vez e guardado. Enquanto você joga, os mapas vizinhos (destinos dos portais) são desenhados em pedaços de 2,5 ms por quadro, e o primeiro mapa é preparado ainda na tela de título.
- **Placa de vídeo:** o multisample do WebGL foi desligado (num jogo de sprites ele não muda nada na tela). Os contornos que eram desenhados a cada quadro (anel do alvo, avisos do Bafome) viraram imagens prontas, com borda suave.
- **Fora da tela:** monstros e objetos longe da câmera ficam ocultos, e monstros só passeando pensam 5 vezes por segundo em vez de todo quadro.
- **Menos criação de objetos:** números de dano, rótulos ("Golpe Poderoso!"), faíscas e explosões são reaproveitados em vez de criados e destruídos a cada golpe. Os rótulos não geram textura nova a cada uso.
- **Busca de caminho:** A* com fila de prioridade e vetores fixos, e colisão consultando uma tabela de números em vez de texto.
- **Movimento mais liso:** ao seguir um caminho, o herói usa todo o deslocamento do quadro e não dá "tranco" a cada ponto.
- **Interface:** o HUD só escreve na página quando um valor muda, as barras usam `transform` (sem recalcular o layout) e as janelas são atualizadas no máximo uma vez por quadro.
- Correção: o jogo esperava o evento `ready`, que o Phaser também dispara antes de carregar as imagens. Agora espera o `assets-ready` da BootScene.

## Novidades da 0.2

- **Caça automática (AUTO):** o herói procura o monstro mais perto (primeiro os que estão atacando), ataca, usa as habilidades configuradas, toma poções e pega os itens do chão. Quando não há monstros por perto, passeia pelas áreas de caça. Andar, clicar no chão ou falar com um NPC desliga. Ele não entra em portais sozinho e, por padrão, não ataca o MVP.
- **Gerenciador de habilidades** (aba Caça automática): liga ou desliga cada habilidade no automático, define a prioridade (▲ ▼) e a condição (sempre, com 2+ ou 3+ inimigos juntos, HP abaixo de 50% ou 30%, quando o efeito acabar). Magias e flechas que o alvo resiste são puladas. Também define a poção de HP, a Poção Azul, o SP guardado para curas, pegar itens e atacar MVP.
- **Barra de atalhos personalizável** (aba Barra de atalhos): escolhe o que fica em cada tecla de 1 a 8.
- **Taxa de experiência de teste:** 5x por padrão, com opções de 1x, 3x, 5x, 10x e 20x no Menu. Vale para a exp de base e de classe.

## O que tem na 0.1

- **Mapas:** Campos Verdes (com o Acampamento Aurora), Bosque Antigo e Covil do Bafome, ligados por portais. O chão é montado a partir dos tiles enviados (`arte/originais/`).
- **NPCs:** Instrutor Dário (muda a classe, cura e salva) e Mercadora Lina (compra e venda).
- **Classes:** Aprendiz → Espadachim, Mago ou Arqueiro no nível de classe 10. Cada classe tem árvore com 4 a 5 habilidades (pré-requisitos e níveis de 1 a 10).
- **Atributos:** FOR, AGI, VIT, INT, DES e SOR. Começa com 48 pontos; cada nível dá ⌊(nível − 1)/5⌋ + 3 e o custo sobe a cada 10 pontos.
- **Combate:** HIT contra Flee, crítico, defesa dura e macia, elementos (Fogo, Água, Vento, Terra, Sagrado, Sombrio, Morto-vivo), tempo de conjuração reduzido pela DES.
- **Monstros:** Gosma (passiva), Lobo Cinzento (ataca sozinho e chama a matilha), Esqueleto, Ent Ancião e o MVP **Bafome**, com Golpe Crescente, Rugido Demoníaco, Gêiser das Trevas e invocação de servos com metade da vida. Ele volta 5 minutos depois de derrotado.
- **Itens:** poções, Asa de Mosca e Asa de Borboleta, espólios para vender, armas, armaduras e acessórios raros.
- **Salvamento:** automático no navegador (a cada 20 s, ao trocar de mapa e ao subir de nível).

## Estrutura

```
src/
  main.ts        tela de título e início do Phaser
  scene.ts       laço do jogo: movimento, combate, habilidades, itens, portais
  monster.ts     IA dos monstros e ataques especiais do Bafome
  world.ts       monta o mapa a partir dos tiles, colisão e busca de caminho (A*)
  ui.ts          interface (janelas, barra de atalhos, minimapa, registro)
  fx.ts          números de dano e efeitos
  icons.ts       ícones de itens e habilidades desenhados por código
  assets.ts      folhas de sprites e animações
  data/          classes, habilidades, monstros, itens e mapas
  game/          fórmulas do personagem, combate e salvamento
scripts/
  recortar_tiles.py   recorta os tiles das imagens em arte/originais
  inline.mjs          junta tudo num HTML só depois do build
```

**Novo mapa:** adicione em `src/data/maps.ts` (cada caractere é um tile de 64 px; a legenda está no arquivo).
**Novos tiles:** coloque a imagem em `arte/originais/`, ajuste os recortes em `scripts/recortar_tiles.py` e rode `python3 scripts/recortar_tiles.py`.

## Pendências conhecidas

- Os heróis só têm sprites de lado (virados para a direita e espelhados). Para andar em 4 direções faltam as folhas de frente e de costas.
- O sprite do Bafome veio do jogo anterior com restos do fundo xadrez nas bordas.
- Ainda não há cidade própria, missões, cartas nem 2ª classe.
