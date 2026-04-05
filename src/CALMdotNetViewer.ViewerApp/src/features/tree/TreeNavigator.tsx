import { useEffect, useMemo, useState } from "react";
import type { GraphNode, ParsedArchitecture } from "../architecture/types";

interface TreeNavigatorProps {
  parsedArchitecture: ParsedArchitecture;
  selectedElementId: string | null;
  linkedNodeIds: Set<string>;
  onSelectElement: (id: string) => void;
}

const nodesSectionKey = "__nodes__";
const relationshipsSectionKey = "__relationships__";
const flowsSectionKey = "__flows__";

function buildNodeGroups(nodes: GraphNode[]) {
  return nodes.reduce<Array<{ type: string; nodes: GraphNode[] }>>((groups, node) => {
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
}

export function TreeNavigator({
  parsedArchitecture,
  selectedElementId,
  linkedNodeIds,
  onSelectElement
}: TreeNavigatorProps) {
  const nodeGroups = useMemo(() => buildNodeGroups(parsedArchitecture.nodes), [parsedArchitecture.nodes]);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => ({
    [nodesSectionKey]: false,
    [relationshipsSectionKey]: false,
    [flowsSectionKey]: false,
    ...Object.fromEntries(nodeGroups.map((group) => [group.type, false]))
  }));

  useEffect(() => {
    setCollapsedGroups((currentState) => {
      const nextState: Record<string, boolean> = {
        [nodesSectionKey]: currentState[nodesSectionKey] ?? false,
        [relationshipsSectionKey]: currentState[relationshipsSectionKey] ?? false,
        [flowsSectionKey]: currentState[flowsSectionKey] ?? false
      };

      for (const group of nodeGroups) {
        nextState[group.type] = currentState[group.type] ?? false;
      }

      const currentKeys = Object.keys(currentState);
      const nextKeys = Object.keys(nextState);

      if (currentKeys.length !== nextKeys.length) {
        return nextState;
      }

      for (const key of nextKeys) {
        if (currentState[key] !== nextState[key]) {
          return nextState;
        }
      }

      return currentState;
    });
  }, [nodeGroups]);

  useEffect(() => {
    if (!selectedElementId) {
      return;
    }

    const selectedNodeGroup = nodeGroups.find((group) => group.nodes.some((node) => node.id === selectedElementId));
    if (selectedNodeGroup) {
      setCollapsedGroups((currentState) => ({
        ...currentState,
        [nodesSectionKey]: false,
        [selectedNodeGroup.type]: false
      }));
      return;
    }

    if (parsedArchitecture.relationships.some((relationship) => relationship.id === selectedElementId)) {
      setCollapsedGroups((currentState) => ({
        ...currentState,
        [relationshipsSectionKey]: false
      }));
      return;
    }

    if (parsedArchitecture.flows.some((flow) => flow.id === selectedElementId)) {
      setCollapsedGroups((currentState) => ({
        ...currentState,
        [flowsSectionKey]: false
      }));
    }
  }, [nodeGroups, parsedArchitecture.flows, parsedArchitecture.relationships, selectedElementId]);

  function toggleGroup(groupKey: string) {
    setCollapsedGroups((currentState) => ({
      ...currentState,
      [groupKey]: !currentState[groupKey]
    }));
  }

  function setAllGroupsCollapsed(isCollapsed: boolean) {
    setCollapsedGroups({
      [nodesSectionKey]: isCollapsed,
      [relationshipsSectionKey]: isCollapsed,
      [flowsSectionKey]: isCollapsed,
      ...Object.fromEntries(nodeGroups.map((group) => [group.type, isCollapsed]))
    });
  }

  return (
    <aside className="panel">
      <div className="panel-header">
        <h2>Model Elements</h2>
        <div className="tree-panel-actions">
          <button
            aria-label="Expand all sections"
            className="tree-panel-icon-button"
            onClick={() => setAllGroupsCollapsed(false)}
            title="Expand all"
            type="button"
          >
            +
          </button>
          <button
            aria-label="Collapse all sections"
            className="tree-panel-icon-button"
            onClick={() => setAllGroupsCollapsed(true)}
            title="Collapse all"
            type="button"
          >
            -
          </button>
        </div>
      </div>

      <div className="tree-group">
        <section className="tree-section">
          <button
            aria-expanded={!(collapsedGroups[nodesSectionKey] ?? false)}
            className="tree-toggle"
            onClick={() => toggleGroup(nodesSectionKey)}
            type="button"
          >
            <span className={`tree-chevron${collapsedGroups[nodesSectionKey] ? "" : " is-open"}`} aria-hidden="true">
              {"›"}
            </span>
            <span className="tree-toggle-label">Nodes</span>
            <small>{parsedArchitecture.nodes.length}</small>
          </button>

          {!(collapsedGroups[nodesSectionKey] ?? false) ? (
            <div className="tree-subsections">
              {nodeGroups.map((group) => {
                const isCollapsed = collapsedGroups[group.type] ?? false;

                return (
                  <section className="tree-subsection" key={group.type}>
                    <button
                      aria-expanded={!isCollapsed}
                      className="tree-toggle tree-toggle-subgroup"
                      onClick={() => toggleGroup(group.type)}
                      type="button"
                    >
                      <span className={`tree-chevron${isCollapsed ? "" : " is-open"}`} aria-hidden="true">
                        {"›"}
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
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="tree-section">
          <button
            aria-expanded={!(collapsedGroups[relationshipsSectionKey] ?? false)}
            className="tree-toggle"
            onClick={() => toggleGroup(relationshipsSectionKey)}
            type="button"
          >
            <span className={`tree-chevron${collapsedGroups[relationshipsSectionKey] ? "" : " is-open"}`} aria-hidden="true">
              {"›"}
            </span>
            <span className="tree-toggle-label">Relationships</span>
            <small>{parsedArchitecture.relationships.length}</small>
          </button>

          {!(collapsedGroups[relationshipsSectionKey] ?? false) ? (
            <ul className="tree-list tree-sublist">
              {parsedArchitecture.relationships.map((relationship) => (
                <li key={relationship.id}>
                  <button
                    className={`tree-item${selectedElementId === relationship.id ? " is-selected" : ""}`}
                    onClick={() => onSelectElement(relationship.id)}
                    type="button"
                  >
                    <span className="tree-item-label">{relationship.label}</span>
                    <small>{relationship.type}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="tree-section">
          <button
            aria-expanded={!(collapsedGroups[flowsSectionKey] ?? false)}
            className="tree-toggle"
            onClick={() => toggleGroup(flowsSectionKey)}
            type="button"
          >
            <span className={`tree-chevron${collapsedGroups[flowsSectionKey] ? "" : " is-open"}`} aria-hidden="true">
              {"›"}
            </span>
            <span className="tree-toggle-label">Flows</span>
            <small>{parsedArchitecture.flows.length}</small>
          </button>

          {!(collapsedGroups[flowsSectionKey] ?? false) ? (
            <ul className="tree-list tree-sublist">
              {parsedArchitecture.flows.map((flow) => (
                <li key={flow.id}>
                  <button
                    className={`tree-item${selectedElementId === flow.id ? " is-selected" : ""}`}
                    onClick={() => onSelectElement(flow.id)}
                    type="button"
                  >
                    <span className="tree-item-label">
                      {flow.label}
                      {flow.description ? <small>{flow.description}</small> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </aside>
  );
}
