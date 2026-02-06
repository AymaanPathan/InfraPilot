import { z } from "zod";
import { FileText, Key, Eye } from "lucide-react";
import { useState } from "react";

export const configMapsListSchema = z.object({
  configMaps: z.array(
    z.object({
      name: z.string(),
      namespace: z.string().optional(),
      age: z.string().optional(),
      dataKeys: z.array(z.string()).optional(),
      data: z.array(
        z.object({
          key: z.string(),
          value: z.string(),
        }),
      ),
    }),
  ),
});

type ConfigMapsListProps = z.infer<typeof configMapsListSchema>;

export function ConfigMapsList({ configMaps }: ConfigMapsListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">
          ConfigMaps ({configMaps.length})
        </h3>
      </div>

      <div className="grid gap-3">
        {configMaps.map((configMap, index) => {
          const isExpanded = expandedIndex === index;
          const keyCount =
            configMap.dataKeys?.length ||
            (configMap.data ? Object.keys(configMap.data).length : 0);

          return (
            <div
              key={index}
              className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl overflow-hidden hover:bg-zinc-800 transition-all duration-200"
            >
              {/* Header */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-zinc-700/50 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-mono text-sm font-medium text-white truncate">
                          {configMap.name}
                        </h4>
                        {configMap.namespace && (
                          <span className="px-2 py-0.5 bg-blue-500/100/20 text-blue-300 text-xs rounded-md flex-shrink-0">
                            {configMap.namespace}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Key className="w-3 h-3" />
                          {keyCount} key{keyCount !== 1 ? "s" : ""}
                        </span>
                        {configMap.age && (
                          <span className="text-zinc-500">{configMap.age}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {(configMap.data || configMap.dataKeys) && (
                    <button
                      onClick={() => toggleExpand(index)}
                      className="ml-2 p-2 hover:bg-zinc-700/50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Eye
                        className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* Data Keys Preview */}
                {!isExpanded && configMap.dataKeys && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {configMap.dataKeys.slice(0, 3).map((key, kIndex) => (
                      <code
                        key={kIndex}
                        className="px-2 py-0.5 bg-zinc-900/50 backdrop-blur-sm text-zinc-300 rounded text-xs font-mono"
                      >
                        {key}
                      </code>
                    ))}
                    {configMap.dataKeys.length > 3 && (
                      <span className="px-2 py-0.5 text-zinc-500 text-xs">
                        +{configMap.dataKeys.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded Data View */}
              {isExpanded && configMap.data && (
                <div className="border-t border-zinc-800/50 bg-zinc-900/30 p-4">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {Object.entries(configMap.data).map(
                      ([key, value], dIndex) => (
                        <div key={dIndex} className="space-y-1">
                          <div className="text-xs font-medium text-blue-400 font-mono">
                            {key}
                          </div>
                          <pre className="text-xs text-zinc-300 bg-zinc-950/50 rounded-lg p-3 overflow-x-auto">
                            {value as any}
                          </pre>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {configMaps.length === 0 && (
        <div className="text-center py-8 text-zinc-400">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No ConfigMaps found</p>
        </div>
      )}
    </div>
  );
}
