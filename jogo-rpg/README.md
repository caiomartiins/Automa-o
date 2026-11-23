# Terras de Aurora (versão 0.1)

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
| Fechar janela | Esc | × |

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
