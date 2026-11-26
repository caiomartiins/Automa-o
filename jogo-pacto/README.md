# Pacto dos Ecos (protótipo)

RPG tático por turnos de colecionar monstros, feito para o celular em pé. Você monta um time de 4, enfrenta ondas de inimigos e usa a vantagem de elemento e o **Eco** do líder para vencer. Feito com **Phaser 3 + TypeScript + Vite**. Os sprites vêm do jogo do cavaleiro (`../jogo-cavaleiro`).

## Como rodar

```bash
cd jogo-pacto
npm install
npm run dev      # abre em http://localhost:5173
npm run build    # gera a pasta dist/ pronta para publicar
```

## Como funciona a batalha

- **4 contra 4**, por turnos. Cada monstro tem uma **barra de turno** que enche conforme a Velocidade; quem chega a 100% age. A fila no topo mostra quem vem a seguir.
- Cada monstro tem **3 habilidades**: o ataque básico e duas com recarga. Toque na habilidade e depois no alvo. Habilidades em área: toque duas vezes.
- **Elementos:** Fogo > Vento > Água > Fogo; Luz e Sombra são fortes uma contra a outra. Vantagem dá +30% de dano e +15% de crítico; desvantagem dá −20% de dano.
- **Efeitos:** Ataque/Defesa/Velocidade/Crítico ▲, Escudo, Regeneração, Imunidade, Ataque/Defesa ▼, Lento, Atordoado, Queimadura, Provocado e Silêncio. A chance de um efeito negativo pegar depende da Precisão de quem usa contra a Resistência do alvo (mínimo de 15% de resistir).
- **Eco** (o toque próprio do jogo): uma barra do time que enche quando seus monstros agem e levam golpes. Cheia, você ativa o poder do **elemento do líder** sem gastar o turno:
  - Fogo, **Erupção**: dano em todos os inimigos e Queimadura.
  - Água, **Maré Curativa**: cura 30% e limpa efeitos negativos.
  - Vento, **Vendaval**: +35% de barra para os aliados e −35% para os inimigos.
  - Luz, **Aurora**: escudo de 25% da vida e limpeza.
  - Sombra, **Eclipse**: Defesa e Ataque ▼ em todos os inimigos, sem chance de resistir.
- Botões **AUTO** (a IA joga por você) e **2x** (velocidade).
- **Chefes** têm vida ×3,2, aparecem maiores e não podem ser atordoados.

## Progressão

- **Campanha:** 3 regiões com 7 fases cada (Bosque Sussurrante, Cavernas de Magma, Cripta do Abismo), com 2 ou 3 ondas por fase e um chefe no fim de cada região.
- **Estrelas:** 3 se ninguém do time cair, 2 se cair um e 1 se caírem mais.
- **XP:** todos do time ganham XP (25% na derrota). Nível máximo por raridade: 2★ 20, 3★ 25, 4★ 30, 5★ 35.
- **Monstros novos:** algumas fases dão um monstro na primeira vitória.
- **Cristais:** ganhos nas vitórias. Vão ser usados na Invocação (próxima etapa).
- O progresso fica salvo no navegador.

## Monstros (18)

| ★ | Monstro | Elemento | Função |
|---|---|---|---|
| 2 | Gosma Rosada | Água | Suporte (cura, escudo) |
| 2 | Lobo Cinzento | Vento | Ataque (turno extra) |
| 2 | Esqueleto Guerreiro | Sombra | Ataque |
| 3 | Ent Ancião | Água | Defesa (provocar) |
| 3 | Espadachim | Fogo | Ataque |
| 3 | Arqueiro | Vento | Ataque |
| 3 | Mago | Fogo | Ataque em área |
| 3 | Professor | Água | Suporte (barra de turno) |
| 3 | Carniçal | Sombra | Vida (roubo de vida) |
| 4 | Rainha Magmática | Fogo | Suporte (lentidão, quebra de defesa) |
| 4 | Minotauro Brutal | Fogo | Vida (dano pela vida) |
| 4 | Paladino | Luz | Defesa (cura, imunidade) |
| 4 | Bruxo das Tempestades | Vento | Ataque (atordoar) |
| 4 | Atiradora de Elite | Luz | Ataque (crítico) |
| 4 | Caçador de Sombras | Sombra | Ataque (atordoar) |
| 4 | Cavaleiro Alvo | Luz | Ataque (turno extra) |
| 5 | Bafome | Sombra | Ataque |
| 5 | Lorde Ossário | Sombra | Suporte |

Começa com Espadachim, Arqueiro, Professor e Gosma. Paladino, Atiradora e Caçador ficam para a Invocação.

## Estrutura

- `src/data/`: tipos, monstros e habilidades (`units.ts`), fases (`stages.ts`)
- `src/battle/engine.ts`: regras da batalha, sem nada de tela (dá para simular)
- `src/battle/ai.ts`: IA dos inimigos e do modo automático
- `src/scenes/`: telas (início, mapa, time, batalha, monstros)
- `src/sprites.ts`: recorte dos sprites, animações e retratos gerados

## Próximas etapas

1. **Invocação** com os cristais e evolução de estrelas
2. **Glifos** (equipamento com conjuntos)
3. Masmorras de recursos, torre e arena contra a IA
