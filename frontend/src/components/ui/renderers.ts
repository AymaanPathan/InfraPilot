// backend/src/ui/renderers.ts
export function renderPodGrid(pods: any[]) {
  return {
    type: "component",
    componentName: "PodGrid",
    props: {
      title: "All Pods in Cluster",
      pods,
    },
  };
}
