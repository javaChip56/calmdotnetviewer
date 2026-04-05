import { useEffect, useState } from "react";
import type { GraphNode, ParsedArchitecture } from "../architecture/types";

interface TreeNavigatorProps {
  parsedArchitecture: ParsedArchitecture;
  selectedElementId: string | null;
  linkedNodeIds: Set<string>;
  onSelectElement: (id: string) => void;
}

export function TreeNavigator({
  parsedArchitecture,
  selectedElementId,
  linkedNodeIds,
  onSelectElement
}: TreeNavigatorProps) {
  const nodeGroups = parsedArchitecture.nodes.reduce<Array<{ type: string; nodes: GraphNode[] }>>((groups, node) => {
    const existingGroup = groups.find((group) => group.type === node.type);
    if (existingGroup) {
      existingGroup.nodes.push(node);
      return groups;
    }

    groups.push({
      type: node.type,
      nodes: [node]
    });

    return groups;
  }, []);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(nodeGroups.map((group) => [group.type, false]))
  );

  useEffect(() => {
    setCollapsedGroups((currentState) => {
      const nextState = { ...currentState };
      let hasChanges = false;

      for (const group of nodeGroups) {
        if (!(group.type in nextState)) {
          nextState[group.type] = false;
          hasChanges = true;
        }
      }

      for (const groupType of Object.keys(nextState)) {
        if (!nodeGroups.some((group) => group.type === groupType)) {
          delete nextState[groupType];
          hasChanges = true;
        }
      }

      return hasChanges ? nextState : currentState;
    });
  }, [parsedArchitecture.nodes]);

  useEffect(() => {
    if (!selectedElementId) {
      return;
    }

    const selectedGroup = nodeGroups.find((group) => group.nodes.some((node) => node.id === selectedElementId));
    if (!selectedGroup) {
      return;
    }

    setCollapsedGroups((currentState) => ({
      ...currentState,
      [selectedGroup.type]: false
    }));
  }, [parsedArchitecture.nodes, selectedElementId]);

  function toggleGroup(groupType: string) {
    setCollapsedGroups((currentState) => ({
      ...currentState,
      [groupType]: !currentState[groupType]
    }));
  }

  return (
    <aside className="panel">
      <div className="panel-header">
        <h2>Model Elements</h2>
        <span className="panel-meta">{parsedArchitecture.nodes.length} nodes</span>
      </div>

      <div className="tree-group">
        <h3>Nodes</h3>
        {nodeGroups.map((group) => {
          const isCollapsed = collapsedGroups[group.type] ?? false;

          return (
            <section className="tree-section" key={group.type}>
              <button
                aria-expanded={!isCollapsed}
                className="tree-toggle"
                onClick={() => toggleGroup(group.type)}
                type="button"
              >
                <span className={`tree-chevron${isCollapsed ? "" : " is-open"}`} aria-hidden="true">
                  ▸
                </span>
                <span className="tree-toggle-label">{group.type}</span>
                <small>{group.nodes.length}</small>
              </button>

              {!isCollapsed ? (
                <ul className="tree-list tree-sublist">
                  {group.nodes.map((node) => (
                    <li key={node.id}>
                      <button
                        className={`tree-item${selectedElementId === node.id ? " is-selected" : ""}`}
                        onClick={() => onSelectElement(node.id)}
                        type="button"
                      >
                        <span className="tree-item-label">
                          {node.label}
                          {linkedNodeIds.has(node.id) ? " (linked)" : ""}
                        </span>
                        <small>{node.id}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
