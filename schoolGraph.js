export const schoolGraph = {
  // Floor 1
  Commons_1: ["A_Pod_1", "B_Pod_1", "C_Pod_1", "Z_Pod_1", "MainEntrance"],
  A_Pod_1: ["Commons_1", "A_Stair"],
  B_Pod_1: ["Commons_1", "B_Stair"],
  C_Pod_1: ["Commons_1", "C_Stair"],
  Z_Pod_1: ["Commons_1", "Z_Stair", "Natatorium_1"],
  Natatorium_1: ["Z_Pod_1", "CommunityCenter_1"],
  CommunityCenter_1: ["Natatorium_1"],
  MainEntrance: ["Commons_1"],

  // Floor 2
  Commons_2: ["A_Pod_2", "B_Pod_2", "C_Pod_2", "Z_Pod_2"],
  A_Pod_2: ["Commons_2", "A_Stair"],
  B_Pod_2: ["Commons_2", "B_Stair"],
  C_Pod_2: ["Commons_2", "C_Stair"],
  Z_Pod_2: ["Commons_2", "Z_Stair", "Natatorium_2"],
  Natatorium_2: ["Z_Pod_2", "CommunityCenter_2"],
  CommunityCenter_2: ["Natatorium_2"],

  // Floor 3
  Commons_3: ["A_Pod_3", "B_Pod_3", "C_Pod_3", "Z_Pod_3"],
  A_Pod_3: ["Commons_3", "A_Stair"],
  B_Pod_3: ["Commons_3", "B_Stair"],
  C_Pod_3: ["Commons_3", "C_Stair"],
  Z_Pod_3: ["Commons_3", "Z_Stair", "Natatorium_3"],
  Natatorium_3: ["Z_Pod_3", "CommunityCenter_3"],
  CommunityCenter_3: ["Natatorium_3"],

  // Stairs (vertical)
  A_Stair: ["A_Pod_1", "A_Pod_2", "A_Pod_3"],
  B_Stair: ["B_Pod_1", "B_Pod_2", "B_Pod_3"],
  C_Stair: ["C_Pod_1", "C_Pod_2", "C_Pod_3"],
  Z_Stair: ["Z_Pod_1", "Z_Pod_2", "Z_Pod_3"],
};
