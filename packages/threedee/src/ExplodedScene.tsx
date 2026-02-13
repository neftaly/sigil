import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { getTextRenderInfo } from "troika-three-text";
import * as THREE from "three";

import {
  type CellStyle,
  type Database,
  type LayoutNode,
  type OverlayState,
  applyOverlaysToNodeGrid,
  groupCells,
  rasterizeOne,
  subscribe,
} from "@charui/core";

function useVersion(database: Database): number {
  const versionRef = useRef(0);
  const getSnapshot = useCallback(() => versionRef.current, []);
  const sub = useCallback(
    (onStoreChange: () => void) =>
      subscribe(database, () => {
        versionRef.current++;
        onStoreChange();
      }),
    [database],
  );
  return useSyncExternalStore(sub, getSnapshot);
}

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
  const hasBg = Boolean(run.style.bg);
  const runWidth = run.text.length * cellW;

  return (
    <group>
      {hasBg && (
        <mesh
          position={[
            run.col * cellW + runWidth / 2,
            -(run.row + 0.5) * CELL_H,
            LAYER_SPACING / 2 + 0.005,
          ]}
        >
          <planeGeometry args={[runWidth, CELL_H]} />
          <meshBasicMaterial color={run.style.bg!} />
        </mesh>
      )}
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
    </group>
  );
}

function NodePlane({
  node,
  database,
  overlayState,
  depth,
  fonts,
  cellW,
}: {
  node: LayoutNode;
  database: Database;
  overlayState?: OverlayState;
  depth: number;
  fonts?: FontSet;
  cellW: number;
}) {
  const version = useVersion(database);
  const runs = useMemo(() => {
    let grid = rasterizeOne(database, node.id);
    if (!grid) {
      return [];
    }
    if (overlayState && node.bounds) {
      grid = applyOverlaysToNodeGrid(grid, node.bounds, overlayState);
    }
    const result: TextRun[] = [];
    for (let row = 0; row < grid.length; row++) {
      for (const span of groupCells(grid[row])) {
        result.push({ text: span.text, col: span.col, row, style: span.style });
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version signals database mutation
  }, [database, version, node.id, node.bounds, overlayState]);

  const bgColor = node.props.backgroundColor;

  const faceMaterial = useMemo(
    () =>
      bgColor
        ? new THREE.MeshBasicMaterial({ color: bgColor })
        : new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
    [bgColor],
  );

  const sideMaterial = getSideMaterial(bgColor ?? "#555");

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

  const { x, y, width: w, height: h } = bounds;

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

function Scene({
  database,
  overlayState,
  fonts,
}: {
  database: Database;
  overlayState?: OverlayState;
  fonts?: FontSet;
}) {
  const version = useVersion(database);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- version signals database mutation
  }, [database, version]);

  const root = database.rootId ? database.nodes.get(database.rootId) : null;
  const rootW = root?.bounds?.width ?? 0;
  const rootH = root?.bounds?.height ?? 0;

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
          overlayState={overlayState}
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
  overlayState?: OverlayState;
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
  overlayState,
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
      <Scene database={database} overlayState={overlayState} fonts={fonts} />
    </Canvas>
  );
}
