import React, { useEffect, useRef, useState, useMemo } from 'react';

interface NodePoint {
  id: string;
  x: number;
  y: number;
  size?: number;
  tier?: 'crown' | 'mane' | 'chest' | 'abacus' | 'chakra' | 'lotus' | 'base';
}

interface EdgeConnection {
  id: string;
  source: string;
  target: string;
}

export function HeroEmblemNetwork({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const isVisibleRef = useRef<boolean>(true);

  // Active traveling trace pulse state
  const [activePulse, setActivePulse] = useState<{
    pathNodeIds: string[];
    progress: number; // 0 to 1
  } | null>(null);

  // 1. Path-Traced Geometric Structural Skeleton of the Ashoka Lion Capital
  // Canvas coordinate system: viewBox 0 0 500 600
  const nodes: NodePoint[] = useMemo(() => [
    // --- CENTER LION (Facing) ---
    { id: 'c_crown_top', x: 250, y: 55, size: 2.5, tier: 'crown' },
    { id: 'c_ear_l', x: 232, y: 68, size: 2, tier: 'crown' },
    { id: 'c_ear_r', x: 268, y: 68, size: 2, tier: 'crown' },
    { id: 'c_forehead', x: 250, y: 80, size: 2.2, tier: 'crown' },
    { id: 'c_eye_l', x: 240, y: 95, size: 2, tier: 'crown' },
    { id: 'c_eye_r', x: 260, y: 95, size: 2, tier: 'crown' },
    { id: 'c_snout', x: 250, y: 112, size: 2.4, tier: 'crown' },
    { id: 'c_jaw', x: 250, y: 130, size: 2.2, tier: 'crown' },
    { id: 'c_cheek_l', x: 228, y: 115, size: 2, tier: 'mane' },
    { id: 'c_cheek_r', x: 272, y: 115, size: 2, tier: 'mane' },

    // Center Lion Mane
    { id: 'c_mane_t1_l', x: 212, y: 88, size: 2, tier: 'mane' },
    { id: 'c_mane_t1_r', x: 288, y: 88, size: 2, tier: 'mane' },
    { id: 'c_mane_m_l', x: 206, y: 135, size: 2.2, tier: 'mane' },
    { id: 'c_mane_m_r', x: 294, y: 135, size: 2.2, tier: 'mane' },
    { id: 'c_mane_b_l', x: 215, y: 175, size: 2.2, tier: 'mane' },
    { id: 'c_mane_b_r', x: 285, y: 175, size: 2.2, tier: 'mane' },
    { id: 'c_chest_center', x: 250, y: 175, size: 2.5, tier: 'chest' },
    { id: 'c_chest_l', x: 232, y: 220, size: 2, tier: 'chest' },
    { id: 'c_chest_r', x: 268, y: 220, size: 2, tier: 'chest' },
    { id: 'c_paw_l', x: 236, y: 275, size: 2.2, tier: 'chest' },
    { id: 'c_paw_r', x: 264, y: 275, size: 2.2, tier: 'chest' },

    // --- LEFT LION (Profile Facing Left) ---
    { id: 'l_crown', x: 165, y: 82, size: 2.2, tier: 'crown' },
    { id: 'l_ear', x: 184, y: 76, size: 2, tier: 'crown' },
    { id: 'l_eye', x: 148, y: 96, size: 2, tier: 'crown' },
    { id: 'l_snout_upper', x: 122, y: 104, size: 2.4, tier: 'crown' },
    { id: 'l_snout_tip', x: 114, y: 116, size: 2.5, tier: 'crown' },
    { id: 'l_jaw_lower', x: 130, y: 135, size: 2.2, tier: 'crown' },
    { id: 'l_throat', x: 152, y: 145, size: 2, tier: 'mane' },
    { id: 'l_mane_crest_1', x: 174, y: 116, size: 2, tier: 'mane' },
    { id: 'l_mane_crest_2', x: 162, y: 170, size: 2.2, tier: 'mane' },
    { id: 'l_mane_crest_3', x: 154, y: 215, size: 2.2, tier: 'mane' },
    { id: 'l_shoulder', x: 184, y: 228, size: 2.2, tier: 'chest' },
    { id: 'l_flank', x: 168, y: 265, size: 2, tier: 'chest' },
    { id: 'l_paw', x: 178, y: 305, size: 2.4, tier: 'chest' },

    // --- RIGHT LION (Profile Facing Right) ---
    { id: 'r_crown', x: 335, y: 82, size: 2.2, tier: 'crown' },
    { id: 'r_ear', x: 316, y: 76, size: 2, tier: 'crown' },
    { id: 'r_eye', x: 352, y: 96, size: 2, tier: 'crown' },
    { id: 'r_snout_upper', x: 378, y: 104, size: 2.4, tier: 'crown' },
    { id: 'r_snout_tip', x: 386, y: 116, size: 2.5, tier: 'crown' },
    { id: 'r_jaw_lower', x: 370, y: 135, size: 2.2, tier: 'crown' },
    { id: 'r_throat', x: 348, y: 145, size: 2, tier: 'mane' },
    { id: 'r_mane_crest_1', x: 326, y: 116, size: 2, tier: 'mane' },
    { id: 'r_mane_crest_2', x: 338, y: 170, size: 2.2, tier: 'mane' },
    { id: 'r_mane_crest_3', x: 346, y: 215, size: 2.2, tier: 'mane' },
    { id: 'r_shoulder', x: 316, y: 228, size: 2.2, tier: 'chest' },
    { id: 'r_flank', x: 332, y: 265, size: 2, tier: 'chest' },
    { id: 'r_paw', x: 322, y: 305, size: 2.4, tier: 'chest' },

    // --- ABACUS FRIEZE (Upper Rail) ---
    { id: 'ab_top_l', x: 140, y: 325, size: 2.2, tier: 'abacus' },
    { id: 'ab_top_ml', x: 195, y: 325, size: 2, tier: 'abacus' },
    { id: 'ab_top_cl', x: 230, y: 325, size: 2, tier: 'abacus' },
    { id: 'ab_top_cr', x: 270, y: 325, size: 2, tier: 'abacus' },
    { id: 'ab_top_mr', x: 305, y: 325, size: 2, tier: 'abacus' },
    { id: 'ab_top_r', x: 360, y: 325, size: 2.2, tier: 'abacus' },

    // --- DHARMA CHAKRA (24-Spoke Wheel of Law in Center of Abacus) ---
    { id: 'chakra_hub', x: 250, y: 368, size: 3.2, tier: 'chakra' },
    // 12 Hexagonal/Octagonal Ring Nodes (radius ~30px)
    { id: 'ch_0', x: 280, y: 368, size: 1.8, tier: 'chakra' },
    { id: 'ch_30', x: 276, y: 383, size: 1.8, tier: 'chakra' },
    { id: 'ch_60', x: 265, y: 394, size: 1.8, tier: 'chakra' },
    { id: 'ch_90', x: 250, y: 398, size: 2, tier: 'chakra' },
    { id: 'ch_120', x: 235, y: 394, size: 1.8, tier: 'chakra' },
    { id: 'ch_150', x: 224, y: 383, size: 1.8, tier: 'chakra' },
    { id: 'ch_180', x: 220, y: 368, size: 1.8, tier: 'chakra' },
    { id: 'ch_210', x: 224, y: 353, size: 1.8, tier: 'chakra' },
    { id: 'ch_240', x: 235, y: 342, size: 1.8, tier: 'chakra' },
    { id: 'ch_270', x: 250, y: 338, size: 2, tier: 'chakra' },
    { id: 'ch_300', x: 265, y: 342, size: 1.8, tier: 'chakra' },
    { id: 'ch_330', x: 276, y: 353, size: 1.8, tier: 'chakra' },

    // Flanking Guardian Figures (Bull & Horse Silhouettes)
    { id: 'g_bull_head', x: 165, y: 350, size: 2, tier: 'abacus' },
    { id: 'g_bull_body', x: 185, y: 368, size: 2, tier: 'abacus' },
    { id: 'g_bull_leg', x: 172, y: 392, size: 1.8, tier: 'abacus' },
    { id: 'g_horse_head', x: 335, y: 350, size: 2, tier: 'abacus' },
    { id: 'g_horse_body', x: 315, y: 368, size: 2, tier: 'abacus' },
    { id: 'g_horse_leg', x: 328, y: 392, size: 1.8, tier: 'abacus' },

    // --- ABACUS FRIEZE (Lower Rail) ---
    { id: 'ab_bot_l', x: 135, y: 412, size: 2.2, tier: 'abacus' },
    { id: 'ab_bot_ml', x: 190, y: 412, size: 2, tier: 'abacus' },
    { id: 'ab_bot_cl', x: 225, y: 412, size: 2, tier: 'abacus' },
    { id: 'ab_bot_cr', x: 275, y: 412, size: 2, tier: 'abacus' },
    { id: 'ab_bot_mr', x: 310, y: 412, size: 2, tier: 'abacus' },
    { id: 'ab_bot_r', x: 365, y: 412, size: 2.2, tier: 'abacus' },

    // --- INVERTED BELL-SHAPED LOTUS PEDESTAL (Padma) ---
    { id: 'lotus_mid_l', x: 175, y: 450, size: 2, tier: 'lotus' },
    { id: 'lotus_mid_ml', x: 215, y: 454, size: 2, tier: 'lotus' },
    { id: 'lotus_mid_c', x: 250, y: 456, size: 2.4, tier: 'lotus' },
    { id: 'lotus_mid_mr', x: 285, y: 454, size: 2, tier: 'lotus' },
    { id: 'lotus_mid_r', x: 325, y: 450, size: 2, tier: 'lotus' },

    { id: 'lotus_base_l', x: 195, y: 488, size: 2.2, tier: 'lotus' },
    { id: 'lotus_base_ml', x: 226, y: 494, size: 2, tier: 'lotus' },
    { id: 'lotus_base_c', x: 250, y: 496, size: 2.5, tier: 'lotus' },
    { id: 'lotus_base_mr', x: 274, y: 494, size: 2, tier: 'lotus' },
    { id: 'lotus_base_r', x: 305, y: 488, size: 2.2, tier: 'lotus' },

    // --- PLINTH FOUNDATION (Satyameva Jayate Base) ---
    { id: 'plinth_top_l', x: 170, y: 520, size: 2, tier: 'base' },
    { id: 'plinth_top_c', x: 250, y: 520, size: 2.4, tier: 'base' },
    { id: 'plinth_top_r', x: 330, y: 520, size: 2, tier: 'base' },

    { id: 'plinth_bot_l', x: 145, y: 550, size: 2.2, tier: 'base' },
    { id: 'plinth_bot_ml', x: 200, y: 550, size: 2, tier: 'base' },
    { id: 'plinth_bot_c', x: 250, y: 550, size: 2.6, tier: 'base' },
    { id: 'plinth_bot_mr', x: 300, y: 550, size: 2, tier: 'base' },
    { id: 'plinth_bot_r', x: 355, y: 550, size: 2.2, tier: 'base' },
  ], []);

  // 2. Structural Constellation Wireframe Edges
  const edges: EdgeConnection[] = useMemo(() => [
    // Center Lion Silhouette & Facial Anatomy
    { id: 'e_c1', source: 'c_crown_top', target: 'c_ear_l' },
    { id: 'e_c2', source: 'c_crown_top', target: 'c_ear_r' },
    { id: 'e_c3', source: 'c_crown_top', target: 'c_forehead' },
    { id: 'e_c4', source: 'c_ear_l', target: 'c_eye_l' },
    { id: 'e_c5', source: 'c_ear_r', target: 'c_eye_r' },
    { id: 'e_c6', source: 'c_forehead', target: 'c_eye_l' },
    { id: 'e_c7', source: 'c_forehead', target: 'c_eye_r' },
    { id: 'e_c8', source: 'c_eye_l', target: 'c_snout' },
    { id: 'e_c9', source: 'c_eye_r', target: 'c_snout' },
    { id: 'e_c10', source: 'c_snout', target: 'c_jaw' },
    { id: 'e_c11', source: 'c_jaw', target: 'c_cheek_l' },
    { id: 'e_c12', source: 'c_jaw', target: 'c_cheek_r' },
    { id: 'e_c13', source: 'c_ear_l', target: 'c_mane_t1_l' },
    { id: 'e_c14', source: 'c_ear_r', target: 'c_mane_t1_r' },
    { id: 'e_c15', source: 'c_mane_t1_l', target: 'c_mane_m_l' },
    { id: 'e_c16', source: 'c_mane_t1_r', target: 'c_mane_m_r' },
    { id: 'e_c17', source: 'c_mane_m_l', target: 'c_mane_b_l' },
    { id: 'e_c18', source: 'c_mane_m_r', target: 'c_mane_b_r' },
    { id: 'e_c19', source: 'c_jaw', target: 'c_chest_center' },
    { id: 'e_c20', source: 'c_mane_b_l', target: 'c_chest_center' },
    { id: 'e_c21', source: 'c_mane_b_r', target: 'c_chest_center' },
    { id: 'e_c22', source: 'c_chest_center', target: 'c_chest_l' },
    { id: 'e_c23', source: 'c_chest_center', target: 'c_chest_r' },
    { id: 'e_c24', source: 'c_chest_l', target: 'c_paw_l' },
    { id: 'e_c25', source: 'c_chest_r', target: 'c_paw_r' },
    { id: 'e_c26', source: 'c_paw_l', target: 'c_paw_r' },

    // Left Lion Silhouette
    { id: 'e_l1', source: 'l_crown', target: 'l_ear' },
    { id: 'e_l2', source: 'l_ear', target: 'c_mane_t1_l' },
    { id: 'e_l3', source: 'l_crown', target: 'l_eye' },
    { id: 'e_l4', source: 'l_eye', target: 'l_snout_upper' },
    { id: 'e_l5', source: 'l_snout_upper', target: 'l_snout_tip' },
    { id: 'e_l6', source: 'l_snout_tip', target: 'l_jaw_lower' },
    { id: 'e_l7', source: 'l_jaw_lower', target: 'l_throat' },
    { id: 'e_l8', source: 'l_crown', target: 'l_mane_crest_1' },
    { id: 'e_l9', source: 'l_mane_crest_1', target: 'l_mane_crest_2' },
    { id: 'e_l10', source: 'l_mane_crest_2', target: 'l_mane_crest_3' },
    { id: 'e_l11', source: 'l_throat', target: 'l_shoulder' },
    { id: 'e_l12', source: 'l_mane_crest_3', target: 'l_flank' },
    { id: 'e_l13', source: 'l_flank', target: 'l_paw' },
    { id: 'e_l14', source: 'l_shoulder', target: 'l_paw' },
    { id: 'e_l15', source: 'l_shoulder', target: 'c_chest_l' },
    { id: 'e_l16', source: 'l_paw', target: 'c_paw_l' },

    // Right Lion Silhouette
    { id: 'e_r1', source: 'r_crown', target: 'r_ear' },
    { id: 'e_r2', source: 'r_ear', target: 'c_mane_t1_r' },
    { id: 'e_r3', source: 'r_crown', target: 'r_eye' },
    { id: 'e_r4', source: 'r_eye', target: 'r_snout_upper' },
    { id: 'e_r5', source: 'r_snout_upper', target: 'r_snout_tip' },
    { id: 'e_r6', source: 'r_snout_tip', target: 'r_jaw_lower' },
    { id: 'e_r7', source: 'r_jaw_lower', target: 'r_throat' },
    { id: 'e_r8', source: 'r_crown', target: 'r_mane_crest_1' },
    { id: 'e_r9', source: 'r_mane_crest_1', target: 'r_mane_crest_2' },
    { id: 'e_r10', source: 'r_mane_crest_2', target: 'r_mane_crest_3' },
    { id: 'e_r11', source: 'r_throat', target: 'r_shoulder' },
    { id: 'e_r12', source: 'r_mane_crest_3', target: 'r_flank' },
    { id: 'e_r13', source: 'r_flank', target: 'r_paw' },
    { id: 'e_r14', source: 'r_shoulder', target: 'r_paw' },
    { id: 'e_r15', source: 'r_shoulder', target: 'c_chest_r' },
    { id: 'e_r16', source: 'r_paw', target: 'c_paw_r' },

    // Abacus Upper Rail
    { id: 'e_ab1', source: 'ab_top_l', target: 'ab_top_ml' },
    { id: 'e_ab2', source: 'ab_top_ml', target: 'ab_top_cl' },
    { id: 'e_ab3', source: 'ab_top_cl', target: 'ab_top_cr' },
    { id: 'e_ab4', source: 'ab_top_cr', target: 'ab_top_mr' },
    { id: 'e_ab5', source: 'ab_top_mr', target: 'ab_top_r' },
    { id: 'e_ab_anchor_l', source: 'l_paw', target: 'ab_top_ml' },
    { id: 'e_ab_anchor_cl', source: 'c_paw_l', target: 'ab_top_cl' },
    { id: 'e_ab_anchor_cr', source: 'c_paw_r', target: 'ab_top_cr' },
    { id: 'e_ab_anchor_r', source: 'r_paw', target: 'ab_top_mr' },

    // Dharma Chakra Spokes & Rim
    { id: 'e_ch_rim1', source: 'ch_0', target: 'ch_30' },
    { id: 'e_ch_rim2', source: 'ch_30', target: 'ch_60' },
    { id: 'e_ch_rim3', source: 'ch_60', target: 'ch_90' },
    { id: 'e_ch_rim4', source: 'ch_90', target: 'ch_120' },
    { id: 'e_ch_rim5', source: 'ch_120', target: 'ch_150' },
    { id: 'e_ch_rim6', source: 'ch_150', target: 'ch_180' },
    { id: 'e_ch_rim7', source: 'ch_180', target: 'ch_210' },
    { id: 'e_ch_rim8', source: 'ch_210', target: 'ch_240' },
    { id: 'e_ch_rim9', source: 'ch_240', target: 'ch_270' },
    { id: 'e_ch_rim10', source: 'ch_270', target: 'ch_300' },
    { id: 'e_ch_rim11', source: 'ch_300', target: 'ch_330' },
    { id: 'e_ch_rim12', source: 'ch_330', target: 'ch_0' },

    // Spokes from Hub
    { id: 'e_ch_sp1', source: 'chakra_hub', target: 'ch_0' },
    { id: 'e_ch_sp2', source: 'chakra_hub', target: 'ch_90' },
    { id: 'e_ch_sp3', source: 'chakra_hub', target: 'ch_180' },
    { id: 'e_ch_sp4', source: 'chakra_hub', target: 'ch_270' },
    { id: 'e_ch_sp5', source: 'chakra_hub', target: 'ch_60' },
    { id: 'e_ch_sp6', source: 'chakra_hub', target: 'ch_120' },
    { id: 'e_ch_sp7', source: 'chakra_hub', target: 'ch_240' },
    { id: 'e_ch_sp8', source: 'chakra_hub', target: 'ch_300' },

    // Flanking Guardian Edges
    { id: 'e_gb1', source: 'g_bull_head', target: 'g_bull_body' },
    { id: 'e_gb2', source: 'g_bull_body', target: 'g_bull_leg' },
    { id: 'e_gb3', source: 'ab_top_ml', target: 'g_bull_head' },
    { id: 'e_gb4', source: 'g_bull_body', target: 'ch_180' },

    { id: 'e_gh1', source: 'g_horse_head', target: 'g_horse_body' },
    { id: 'e_gh2', source: 'g_horse_body', target: 'g_horse_leg' },
    { id: 'e_gh3', source: 'ab_top_mr', target: 'g_horse_head' },
    { id: 'e_gh4', source: 'g_horse_body', target: 'ch_0' },

    // Abacus Lower Rail
    { id: 'e_abb1', source: 'ab_bot_l', target: 'ab_bot_ml' },
    { id: 'e_abb2', source: 'ab_bot_ml', target: 'ab_bot_cl' },
    { id: 'e_abb3', source: 'ab_bot_cl', target: 'ab_bot_cr' },
    { id: 'e_abb4', source: 'ab_bot_cr', target: 'ab_bot_mr' },
    { id: 'e_abb5', source: 'ab_bot_mr', target: 'ab_bot_r' },
    { id: 'e_ab_side_l', source: 'ab_top_l', target: 'ab_bot_l' },
    { id: 'e_ab_side_r', source: 'ab_top_r', target: 'ab_bot_r' },
    { id: 'e_ch_to_bot', source: 'ch_90', target: 'ab_bot_cl' },
    { id: 'e_ch_to_bot2', source: 'ch_90', target: 'ab_bot_cr' },

    // Lotus Pedestal Fluted Petals
    { id: 'e_lot1', source: 'ab_bot_l', target: 'lotus_mid_l' },
    { id: 'e_lot2', source: 'ab_bot_ml', target: 'lotus_mid_ml' },
    { id: 'e_lot3', source: 'ab_bot_cl', target: 'lotus_mid_c' },
    { id: 'e_lot4', source: 'ab_bot_cr', target: 'lotus_mid_c' },
    { id: 'e_lot5', source: 'ab_bot_mr', target: 'lotus_mid_mr' },
    { id: 'e_lot6', source: 'ab_bot_r', target: 'lotus_mid_r' },

    { id: 'e_lot_b1', source: 'lotus_mid_l', target: 'lotus_base_l' },
    { id: 'e_lot_b2', source: 'lotus_mid_ml', target: 'lotus_base_ml' },
    { id: 'e_lot_b3', source: 'lotus_mid_c', target: 'lotus_base_c' },
    { id: 'e_lot_b4', source: 'lotus_mid_mr', target: 'lotus_base_mr' },
    { id: 'e_lot_b5', source: 'lotus_mid_r', target: 'lotus_base_r' },
    { id: 'e_lot_cross1', source: 'lotus_base_l', target: 'lotus_base_ml' },
    { id: 'e_lot_cross2', source: 'lotus_base_ml', target: 'lotus_base_c' },
    { id: 'e_lot_cross3', source: 'lotus_base_c', target: 'lotus_base_mr' },
    { id: 'e_lot_cross4', source: 'lotus_base_mr', target: 'lotus_base_r' },

    // Plinth Foundation
    { id: 'e_pl1', source: 'lotus_base_l', target: 'plinth_top_l' },
    { id: 'e_pl2', source: 'lotus_base_c', target: 'plinth_top_c' },
    { id: 'e_pl3', source: 'lotus_base_r', target: 'plinth_top_r' },
    { id: 'e_pl4', source: 'plinth_top_l', target: 'plinth_top_c' },
    { id: 'e_pl5', source: 'plinth_top_c', target: 'plinth_top_r' },

    { id: 'e_pl6', source: 'plinth_top_l', target: 'plinth_bot_l' },
    { id: 'e_pl7', source: 'plinth_top_c', target: 'plinth_bot_c' },
    { id: 'e_pl8', source: 'plinth_top_r', target: 'plinth_bot_r' },
    { id: 'e_pl9', source: 'plinth_bot_l', target: 'plinth_bot_ml' },
    { id: 'e_pl10', source: 'plinth_bot_ml', target: 'plinth_bot_c' },
    { id: 'e_pl11', source: 'plinth_bot_c', target: 'plinth_bot_mr' },
    { id: 'e_pl12', source: 'plinth_bot_mr', target: 'plinth_bot_r' },
  ], []);

  // Quick lookup maps
  const nodeMap = useMemo(() => {
    const map: Record<string, NodePoint> = {};
    nodes.forEach((n) => {
      map[n.id] = n;
    });
    return map;
  }, [nodes]);

  // 3. Pre-defined anatomical paths for the traveling self-tracing pulse
  const pulseTracks = useMemo(() => [
    // Track 1: Left Lion Snout -> Mane -> Abacus -> Chakra -> Lotus -> Foundation
    [
      'l_snout_tip',
      'l_snout_upper',
      'l_eye',
      'l_crown',
      'l_mane_crest_1',
      'l_mane_crest_2',
      'l_shoulder',
      'l_paw',
      'ab_top_ml',
      'g_bull_body',
      'ch_180',
      'chakra_hub',
      'ch_90',
      'ab_bot_cl',
      'lotus_mid_c',
      'lotus_base_c',
      'plinth_top_c',
      'plinth_bot_c',
    ],
    // Track 2: Right Lion Snout -> Crown -> Center Chest -> Chakra -> Base
    [
      'r_snout_tip',
      'r_snout_upper',
      'r_eye',
      'r_crown',
      'r_ear',
      'c_mane_t1_r',
      'c_chest_center',
      'c_chest_r',
      'c_paw_r',
      'ab_top_cr',
      'ch_270',
      'chakra_hub',
      'ch_60',
      'ch_90',
      'ab_bot_cr',
      'lotus_mid_mr',
      'lotus_base_r',
      'plinth_top_r',
      'plinth_bot_r',
    ],
    // Track 3: Center Lion Crown -> Face -> Heart -> Chakra Hub -> Lotus Petal
    [
      'c_crown_top',
      'c_forehead',
      'c_snout',
      'c_jaw',
      'c_chest_center',
      'c_chest_l',
      'c_paw_l',
      'ab_top_cl',
      'ch_240',
      'chakra_hub',
      'ch_90',
      'ab_bot_cl',
      'lotus_mid_ml',
      'lotus_base_ml',
      'plinth_bot_ml',
    ],
    // Track 4: Chakra Full Orbit -> Base Anchor
    [
      'ab_top_ml',
      'g_bull_head',
      'g_bull_body',
      'ch_180',
      'ch_210',
      'ch_240',
      'ch_270',
      'ch_300',
      'ch_330',
      'ch_0',
      'g_horse_body',
      'g_horse_leg',
      'ab_bot_mr',
      'lotus_mid_r',
      'lotus_base_mr',
      'plinth_bot_c',
    ],
  ], []);

  // 4. Trace Pulse Animation Engine (Restrained & Periodic)
  useEffect(() => {
    // Visibility listener to halt animation loops when tab is inactive
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let pulseTimeout: number | null = null;

    const launchPulse = () => {
      if (!isVisibleRef.current) {
        // Reschedule check
        pulseTimeout = window.setTimeout(launchPulse, 3000);
        return;
      }

      // Pick a random track
      const track = pulseTracks[Math.floor(Math.random() * pulseTracks.length)];
      const startTime = performance.now();
      const duration = 2800; // ms for pulse to traverse track

      const step = (now: number) => {
        if (!isVisibleRef.current) {
          setActivePulse(null);
          pulseTimeout = window.setTimeout(launchPulse, 3500);
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);

        setActivePulse({
          pathNodeIds: track,
          progress,
        });

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          setActivePulse(null);
          // Wait 3.5 to 5.0 seconds before launching next pulse (sparse & restrained)
          const nextDelay = 3500 + Math.random() * 2000;
          pulseTimeout = window.setTimeout(launchPulse, nextDelay);
        }
      };

      animFrameRef.current = requestAnimationFrame(step);
    };

    // Initial launch delay
    pulseTimeout = window.setTimeout(launchPulse, 1200);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pulseTimeout) clearTimeout(pulseTimeout);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [pulseTracks]);

  // Compute current physical coordinates of the traveling pulse point
  const currentPulsePos = useMemo(() => {
    if (!activePulse || activePulse.pathNodeIds.length < 2) return null;
    const { pathNodeIds, progress } = activePulse;
    const totalSegments = pathNodeIds.length - 1;
    const scaledProgress = progress * totalSegments;
    const currentSegmentIndex = Math.min(Math.floor(scaledProgress), totalSegments - 1);
    const segmentProgress = scaledProgress - currentSegmentIndex;

    const pA = nodeMap[pathNodeIds[currentSegmentIndex]];
    const pB = nodeMap[pathNodeIds[currentSegmentIndex + 1]];
    if (!pA || !pB) return null;

    const x = pA.x + (pB.x - pA.x) * segmentProgress;
    const y = pA.y + (pB.y - pA.y) * segmentProgress;
    return { x, y, activeNodeId: segmentProgress > 0.5 ? pB.id : pA.id };
  }, [activePulse, nodeMap]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none select-none relative flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 500 600"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full max-w-[440px] lg:max-w-[480px] xl:max-w-[520px] max-h-[580px] drop-shadow-[0_0_35px_rgba(184,147,95,0.08)]"
      >
        <defs>
          {/* Subtle brass glow filter for active pulse */}
          <filter id="emblemBrassGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Radial mask for soft vignette edge blending */}
          <radialGradient id="emblemVignette" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EDE8DE" stopOpacity="0.9" />
            <stop offset="85%" stopColor="#B8935F" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#131114" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Constellation Network Edges (Background Skeleton) */}
        <g id="emblem-edges" opacity={0.65}>
          {edges.map((e) => {
            const pA = nodeMap[e.source];
            const pB = nodeMap[e.target];
            if (!pA || !pB) return null;

            // Check if this edge is currently part of the active pulse track
            const isEdgeInTrack =
              activePulse &&
              activePulse.pathNodeIds.some(
                (id, idx) =>
                  (id === e.source && activePulse.pathNodeIds[idx + 1] === e.target) ||
                  (id === e.target && activePulse.pathNodeIds[idx + 1] === e.source)
              );

            return (
              <line
                key={e.id}
                x1={pA.x}
                y1={pA.y}
                x2={pB.x}
                y2={pB.y}
                stroke={isEdgeInTrack ? 'rgba(237, 232, 222, 0.45)' : 'rgba(184, 147, 95, 0.22)'}
                strokeWidth={isEdgeInTrack ? 1.2 : 0.8}
                strokeDasharray={e.source.startsWith('ch_') ? 'none' : '2 3'}
                className="transition-colors duration-300"
              />
            );
          })}
        </g>

        {/* 2. Constellation Network Nodes (Landmark Points) */}
        <g id="emblem-nodes">
          {nodes.map((n) => {
            const isChakra = n.tier === 'chakra';
            const isHub = n.id === 'chakra_hub';
            const isPlinth = n.tier === 'base';

            return (
              <g key={n.id}>
                {/* Outer delicate aura for major structural anchors */}
                {(isHub || isPlinth || n.id === 'c_crown_top' || n.id === 'c_chest_center') && (
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={(n.size || 2) * 2.2}
                    fill="none"
                    stroke="rgba(184, 147, 95, 0.2)"
                    strokeWidth={0.7}
                  />
                )}

                {/* Core Node Dot */}
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.size || 2}
                  fill={isHub ? '#EDE8DE' : '#B8935F'}
                  opacity={isChakra ? 0.75 : 0.55}
                />
              </g>
            );
          })}
        </g>

        {/* 3. The Signature Self-Tracing Traveling Pulse */}
        {currentPulsePos && (
          <g filter="url(#emblemBrassGlow)" className="pointer-events-none">
            {/* Outer soft traveling aura */}
            <circle
              cx={currentPulsePos.x}
              cy={currentPulsePos.y}
              r={12}
              fill="#B8935F"
              opacity={0.2}
            />
            {/* Inner luminous halo */}
            <circle
              cx={currentPulsePos.x}
              cy={currentPulsePos.y}
              r={6.5}
              fill="#B8935F"
              opacity={0.65}
            />
            {/* Pure white-gold focal point */}
            <circle
              cx={currentPulsePos.x}
              cy={currentPulsePos.y}
              r={2.8}
              fill="#EDE8DE"
              opacity={0.95}
            />
          </g>
        )}
      </svg>
    </div>
  );
}
