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
        <h3 className="text-lg font-semibold text-white">
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
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden hover:bg-slate-800 transition-all duration-200"
            >
              {/* Header */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-slate-700/50 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-mono text-sm font-semibold text-white truncate">
                          {configMap.name}
                        </h4>
                        {configMap.namespace && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-md flex-shrink-0">
                            {configMap.namespace}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Key className="w-3 h-3" />
                          {keyCount} key{keyCount !== 1 ? "s" : ""}
                        </span>
                        {configMap.age && (
                          <span className="text-slate-500">
                            {configMap.age}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {(configMap.data || configMap.dataKeys) && (
                    <button
                      onClick={() => toggleExpand(index)}
                      className="ml-2 p-2 hover:bg-slate-700/50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Eye
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
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
                        className="px-2 py-0.5 bg-slate-900/50 text-slate-300 rounded text-xs font-mono"
                      >
                        {key}
                      </code>
                    ))}
                    {configMap.dataKeys.length > 3 && (
                      <span className="px-2 py-0.5 text-slate-500 text-xs">
                        +{configMap.dataKeys.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded Data View */}
              {isExpanded && configMap.data && (
                <div className="border-t border-slate-700/50 bg-slate-900/30 p-4">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {Object.entries(configMap.data).map(
                      ([key, value], dIndex) => (
                        <div key={dIndex} className="space-y-1">
                          <div className="text-xs font-semibold text-blue-400 font-mono">
                            {key}
                          </div>
                          <pre className="text-xs text-slate-300 bg-slate-950/50 rounded-lg p-3 overflow-x-auto">
                            {value}
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
        <div className="text-center py-8 text-slate-400">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No ConfigMaps found</p>
        </div>
      )}
    </div>
  );
}
