import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { getTextRenderInfo } from "troika-three-text";
import * as THREE from "three";

import {
  type CellStyle,
  type Database,
  type LayoutNode,
  rasterizeOne,
} from "@charui/core";

export interface FontSet {
  regular: string;
  bold: string;
  italic: string;
  boldItalic: string;
}

function pickFont(
  fonts: FontSet | undefined,
  style: CellStyle,
): string | undefined {
  if (!fonts) {
    return undefined;
  }
  if (style.bold && style.italic) {
    return fonts.boldItalic;
  }
  if (style.bold) {
    return fonts.bold;
  }
  if (style.italic) {
    return fonts.italic;
  }
  return fonts.regular;
}

const LAYER_SPACING = 0.6;
const FONT_SIZE = 1;
const CELL_H = FONT_SIZE;

const sideCache = new Map<string, THREE.MeshStandardMaterial>();

function getSideMaterial(color: string): THREE.MeshStandardMaterial {
  let mat = sideCache.get(color);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
      roughness: 0.05,
      metalness: 0.8,
    });
    sideCache.set(color, mat);
  }
  return mat;
}

function getRenderOrder(database: Database): Map<string, number> {
  const order = new Map<string, number>();
  let index = 0;

  function walk(nodeId: string) {
    order.set(nodeId, index++);
    const node = database.nodes.get(nodeId);
    if (node) {
      for (const childId of node.childIds) {
        walk(childId);
      }
    }
  }

  if (database.rootId) {
    walk(database.rootId);
  }
  return order;
}

interface TextRun {
  text: string;
  col: number;
  row: number;
  style: CellStyle;
}

function TextRunMesh({
  run,
  fonts,
  cellW,
}: {
  run: TextRun;
  fonts?: FontSet;
  cellW: number;
}) {
  return (
    <Text
      font={pickFont(fonts, run.style)}
      position={[
        run.col * cellW,
        -(run.row + 0.5) * CELL_H,
        LAYER_SPACING / 2 + 0.01,
      ]}
      fontSize={FONT_SIZE}
      color={run.style.fg ?? "#ccc"}
      anchorX="left"
      anchorY="middle"
    >
      {run.text}
    </Text>
  );
}

function NodePlane({
  node,
  database,
  depth,
  fonts,
  cellW,
}: {
  node: LayoutNode;
  database: Database;
  depth: number;
  fonts?: FontSet;
  cellW: number;
}) {
  const runs = useMemo(() => {
    const grid = rasterizeOne(database, node.id);
    if (!grid) {
      return [];
    }
    const result: TextRun[] = [];
    for (let row = 0; row < grid.length; row++) {
      let current: TextRun | null = null;
      for (let col = 0; col < (grid[0]?.length ?? 0); col++) {
        const cell = grid[row][col];
        if (cell.continuation) {
          continue;
        }
        if (
          current &&
          current.style.fg === cell.style.fg &&
          current.style.bold === cell.style.bold &&
          current.style.italic === cell.style.italic
        ) {
          current.text += cell.char;
        } else {
          if (current) {
            result.push(current);
          }
          current = { text: cell.char, col, row, style: cell.style };
        }
      }
      if (current) {
        result.push(current);
      }
    }
    return result;
  }, [database, node.id]);

  const hasBg = Boolean(node.props.backgroundColor);

  const faceMaterial = useMemo(
    () =>
      hasBg
        ? new THREE.MeshBasicMaterial({
            color: node.props.backgroundColor as string,
          })
        : new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
    [hasBg, node.props.backgroundColor],
  );

  const sideMaterial = getSideMaterial(
    hasBg ? (node.props.backgroundColor as string) : "#555",
  );

  // Box material order: +X, -X, +Y, -Y, +Z (front), -Z (back)
  const materials = useMemo(
    () => [
      sideMaterial,
      sideMaterial,
      sideMaterial,
      sideMaterial,
      faceMaterial,
      faceMaterial,
    ],
    [faceMaterial, sideMaterial],
  );

  const { bounds } = node;
  if (!bounds) {
    return null;
  }

  const { x, y, w, h } = bounds;

  return (
    <group
      position={[
        (x + w / 2) * cellW,
        -(y + h / 2) * CELL_H,
        depth * LAYER_SPACING,
      ]}
    >
      <mesh material={materials}>
        <boxGeometry args={[w * cellW, h * CELL_H, LAYER_SPACING]} />
      </mesh>
      <group position={[(-w / 2) * cellW, (h / 2) * CELL_H, 0]}>
        {runs.map((run) => (
          <TextRunMesh
            key={`${run.col}-${run.row}`}
            run={run}
            fonts={fonts}
            cellW={cellW}
          />
        ))}
      </group>
    </group>
  );
}

function Scene({ database, fonts }: { database: Database; fonts?: FontSet }) {
  const [cellW, setCellW] = useState<number | null>(null);
  const fontUrl = fonts?.regular;

  useEffect(() => {
    getTextRenderInfo(
      { text: "X", font: fontUrl, fontSize: FONT_SIZE },
      (info: { blockBounds: [number, number, number, number] }) => {
        const width = info.blockBounds[2] - info.blockBounds[0];
        setCellW(width);
      },
    );
  }, [fontUrl]);

  const nodes = useMemo(() => {
    const order = getRenderOrder(database);
    const result: { node: LayoutNode; depth: number }[] = [];
    for (const node of database.nodes.values()) {
      if (node.bounds) {
        result.push({ node, depth: order.get(node.id) ?? 0 });
      }
    }
    return result;
  }, [database]);

  const root = database.rootId ? database.nodes.get(database.rootId) : null;
  const rootW = root?.bounds?.w ?? 0;
  const rootH = root?.bounds?.h ?? 0;

  if (cellW === null) {
    return null;
  }

  return (
    <group position={[(-rootW / 2) * cellW, (rootH / 2) * CELL_H, 0]}>
      {nodes.map(({ node, depth }) => (
        <NodePlane
          key={node.id}
          node={node}
          database={database}
          depth={depth}
          fonts={fonts}
          cellW={cellW}
        />
      ))}
    </group>
  );
}

export interface ExplodedSceneProps {
  database: Database;
  interactive?: boolean;
  fonts?: FontSet;
}

const noopEvents = () => ({
  priority: 0,
  enabled: false,
  compute: () => {},
  connected: undefined,
});

export function ExplodedScene({
  database,
  interactive = true,
  fonts,
}: ExplodedSceneProps) {
  return (
    <Canvas
      orthographic
      camera={{ position: [0, 0, 20], zoom: 20, near: 0.1, far: 200 }}
      style={{ width: "100%", height: "100%", background: "#0a0a0a" }}
      gl={{ outputColorSpace: THREE.SRGBColorSpace, antialias: true }}
      dpr={[1, 2]}
      events={interactive ? undefined : noopEvents}
    >
      {interactive && <OrbitControls />}
      <ambientLight intensity={1} />
      <Scene database={database} fonts={fonts} />
    </Canvas>
  );
}
