// Las jugadas de las partidas que recuerda el Rey: las escribe
// tools/partidas.mjs (simuladas con la IA del Cerco); no se tocan a mano. Lo
// que se busca en ellas, en partidas.js; lo que se cuenta de ellas (story.js:
// PARTIDAS y el libro, NOTES.partidas), de éstas: si cambian, se repasa.
// (casillas como en el ajedrez: columnas a-i, filas 9-1 desde el lado del Rey;
// pend: la que iba a jugar, en la partida que quedó a medias)
export const JUGADAS = {
  banco: { moves: 'b5b1 c5b5 d9c9 d5d8 c9c5 g5g7 c5c8 e5d5 e9d9 g7g9 h5h9 f5f7 i5f5 d5d7 b1b7 d7d5 d1d3 e4f4 f1f3 e6b6 i6c6 d5d6 h9h6 d6e6 e2e4 e7c7 d9d7 e6f6 c6e6 f7f8 d7f7' },
  hijo: { moves: 'e8c8 e7d7 b5b9 e6e8 h5h7 e5e6 i6h6 e6f6 a6d6 f5f2 d9d8 f6f7 a5a7 g5h5 i4g4 f7f3 i5i3 f3g3 f1g1 h5g5 d1d4 c5c4 h6g6 f2i2 h7h4 g3f3 e2f2 f3f7 g6g7 f7f6 g7g6 f6f5 b9b5 g5g2 h4h5 f5f4 g6g4 e3e2 e1f1 f4f7 g4g7 f7f3 b5b3 f3f6 i3i6 f6f4 i6i4 e2e1 a4a2 e4e2 f1f3 e2f2 g7g3 c4c7 b3b4 f4f6 i4i6 f2c2 b4f4 f6g6 f9g9 g6g7 i6i7 g7f7 e9f9 f7f5 a7a5 f5b5 f9f8 b5b9' },
  reina: { moves: 'e8i8 c5c3 e2i2 c3c8 h5h9 e3e2 b5b1 c8c5 i2i3 e2g2 f1f2 g2g4 f2a2 c5c8 a6a8 c8c5 a8a6 g4f4 a2c2 e7d7 h9h7 c5c8 i8g8 c8d8 b1b3 d8c8 f9f8 g5g3 e9e8 g3g5 e8e9 g5g3 e9e8 g3g5 e8e9' },
  alcaide: { moves: 'e2a2 e4b4 i4e4 e3c3 e1e3 c5c4 a4a3 b4a4 a3b3 d5d4 b3a3 f5f4 f9f5 e6f6 h5g5 f6g6 a6e6 f4g4 i6h6 g4f4 a5a7 d4d3 a2e2 f4f3 i5f5 g6g5 e9f9 c4c6 a3a4 c6d6 e6g6 g5g3 h6h5 d6d7 a7c7 c3c4 e8e7 c4c6 a4c4 d3c3 b5c5 f3e3 d9d6 c3c2 c4e4 g3f3 e2e3 f3g3 f9f5 g3g4 e7e6 g4g5 f1f5 c2c3 d6d5' },
  arzobispo: { moves: 'f1g1 f5f8 h5h7 g5g4 i5h5 e5g5 h7g7 g4f4 g1g3 f8f6 i4g4 g5f5 g3f3 e4b4 d1d3 e6b6 e2e4 d5d8 e4c4 f5d5 a5b5 d5d7 a6a7 b6c6 a7b7 c6c7 e1e4 f6a6 i6e6 a6a7 e6c6 c7c8 a4a6 a7a9 c6c7 d7d6 e8e6 d6d5 h5f5 d8d6 a6c6 c8e8 g7e7 a9a5 c6d6 a5a3 c7c5 d5d4 d6d5' },
  pequeno: { moves: 'e8a8 e3b3 a6a7 c5c1 a4a3 e4h4 h5h7 e5e4 a5a4 e4g4 f1g1 g4g3 i4i3 g5h5 h7g7 h4b4 f9f8 g3g4 i3i4 e6b6 a7b7 g4g3 i4i3 c1b1 f8b8 g3c3 a8a5 c3c9' },
  campana: { moves: 'h5h6 f5f6 e2g2 e5f5 d1d3 c5c3 b5c5 f5d5 g2d2 g5h5 i4g4 e6c6 c5b5 e7h7 d9d7 c3b3 a4c4 d5f5 f1f2 h7h9 d2d4 f5f4 f2f3 e3e2 d7g7 b3b1 g7g5 f4f5 f9f7 h9h8 e8g8 h8h5 g4f4 h5h3 i5h5 e2e3 d4d3', pend: 'f5d5' },
  lisboa: { moves: 'h5h9 f5f4 e8g8 e7i7 d9d7 e6f6 g8i8 e4b4 i6g6 e3i3 e2e3 f4g4 e9e6 e5f5 f1f2 i3i2 e3b3 f5f7 g6g7 f7f4 a4c4 g4g1 a6c6 g1f1 b3f3 f4g4 f2g2 g5h5 g7g5 g4e4 c6c5 i2h2 e1e2 h2h7 f9f7 h7h2 d7d3 h2h3 i4g4 f1g1 c5d5 g1e1 f3f1 h3h6 e2e3 e4e5 g4f4 h6h8 f7f5 h8h7 c4e4' },
  goncalo: { moves: 'e8i8 e7c7 e2i2 g5g7 b5b1 g7e7 d9d7 f5f8 f1f5 c7a7 i6f6 a7c7 f6f7 d5d2 i8d8 e6d6 i5i6 c5b5 b1c1 e5c5 c1c4 e3c3 a4c4 c5c6 e1e3 c6c5 i4c4 c5e5 c4e4 e5e6 f7f6 d2a2 h5h7 d6d5 i2c2 e6c6 e4c4 c7d7 d8c8 d7d6 c4c5 e7c7 a6b6 a2a3 h7d7 a3b3 c8a8 b3b5 f5f1 b5b4 c2c4 b4b2 a8a7 b2c2 i6i7 c2c1 f1g1 c1a1 c4d4 a1c1 f6e6 c1c4 d4d5 c6c5 d7d5 c7e7 b6b5' },
  canciller: { moves: 'b5b1 d5d8 d1d7 e5d5 e1d1 c5c7 a4c4 c7c6 d1d3 e6h6 f1f3 e4h4 b1b7 d5d6 c4g4 d6f6 i5h5 c6b6 a5c5 b6d6 e8f8 f6g6 f8g8 e7d7 f9f7 g6g7 i6i7 d7e7 i7h7 g7f7 e9f9 e7d7 g8e8 f7e7 i4i6 e7e4 c5c4 d6g6 b7b5 e4e6 d9c9 d7f7 c9c6 g6h6 e2e4 e6g6 e8g8 g6d6 f9d9 d6e6 g8e8 e6g6 d9g9 f7g7 c6d6 g6f6 g9f9 g7g8 h7i7 f6f7 e8e7 f7f6 i7h7 f5f4 i6g6 f6f5 b5c5 g8h8 h5g5 h8h9 c5d5 h9i9 f9f6 i9i5 h7h5 i5i7 g6g7 i7i5 e4d4 i5i1 d4e4 f5e5 e7e6 e5f5 e4f4' },
};
