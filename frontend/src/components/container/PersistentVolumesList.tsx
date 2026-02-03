import { z } from "zod";
import { HardDrive, Check, X, Clock, Database } from "lucide-react";

export const persistentVolumesListSchema = z.object({
  volumes: z.array(
    z.object({
      name: z.string(),
      capacity: z.string().optional(),
      accessModes: z.array(z.string()).optional(),
      reclaimPolicy: z.string().optional(),
      status: z.string().optional(),
      claim: z.string().optional(),
      storageClass: z.string().optional(),
      age: z.string().optional(),
      volumeMode: z.string().optional(),
    }),
  ),
});

type PersistentVolumesListProps = z.infer<typeof persistentVolumesListSchema>;

export function PersistentVolumesList({ volumes }: PersistentVolumesListProps) {
  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "bound":
        return {
          bg: "bg-green-500/20",
          text: "text-green-300",
          border: "border-green-500/30",
          icon: <Check className="w-4 h-4" />,
        };
      case "available":
        return {
          bg: "bg-blue-500/20",
          text: "text-blue-300",
          border: "border-blue-500/30",
          icon: <Clock className="w-4 h-4" />,
        };
      case "released":
        return {
          bg: "bg-yellow-500/20",
          text: "text-yellow-300",
          border: "border-yellow-500/30",
          icon: <Clock className="w-4 h-4" />,
        };
      case "failed":
        return {
          bg: "bg-red-500/20",
          text: "text-red-300",
          border: "border-red-500/30",
          icon: <X className="w-4 h-4" />,
        };
      default:
        return {
          bg: "bg-slate-500/20",
          text: "text-slate-300",
          border: "border-slate-500/30",
          icon: <HardDrive className="w-4 h-4" />,
        };
    }
  };

  const getAccessModeLabel = (mode: string) => {
    const modes: Record<string, string> = {
      ReadWriteOnce: "RWO",
      ReadOnlyMany: "ROX",
      ReadWriteMany: "RWX",
      ReadWriteOncePod: "RWOP",
    };
    return modes[mode] || mode;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Persistent Volumes ({volumes.length})
        </h3>
      </div>

      <div className="grid gap-3">
        {volumes.map((volume, index) => {
          const statusConfig = getStatusColor(volume.status);

          return (
            <div
              key={index}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-slate-700/50 rounded-lg">
                    <Database className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-mono text-sm font-semibold text-white truncate">
                        {volume.name}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {volume.capacity && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-md font-semibold">
                          {volume.capacity}
                        </span>
                      )}
                      {volume.storageClass && (
                        <span className="text-slate-400">
                          Class: {volume.storageClass}
                        </span>
                      )}
                      {volume.age && (
                        <span className="text-slate-500">{volume.age}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                {volume.status && (
                  <div
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                  >
                    {statusConfig.icon}
                    {volume.status}
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Access Modes */}
                {volume.accessModes && volume.accessModes.length > 0 && (
                  <div>
                    <div className="text-xs text-slate-400 mb-1">
                      Access Modes
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {volume.accessModes.map((mode, mIndex) => (
                        <span
                          key={mIndex}
                          className="px-2 py-0.5 bg-slate-900/50 text-slate-300 rounded text-xs font-mono"
                        >
                          {getAccessModeLabel(mode)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reclaim Policy */}
                {volume.reclaimPolicy && (
                  <div>
                    <div className="text-xs text-slate-400 mb-1">
                      Reclaim Policy
                    </div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        volume.reclaimPolicy === "Retain"
                          ? "bg-green-500/20 text-green-300"
                          : volume.reclaimPolicy === "Delete"
                            ? "bg-red-500/20 text-red-300"
                            : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {volume.reclaimPolicy}
                    </span>
                  </div>
                )}

                {/* Volume Mode */}
                {volume.volumeMode && (
                  <div>
                    <div className="text-xs text-slate-400 mb-1">
                      Volume Mode
                    </div>
                    <span className="text-slate-300 text-xs">
                      {volume.volumeMode}
                    </span>
                  </div>
                )}

                {/* Claim */}
                {volume.claim && (
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Bound To</div>
                    <code className="text-xs text-blue-300 font-mono">
                      {volume.claim}
                    </code>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {volumes.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <HardDrive className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No persistent volumes found</p>
        </div>
      )}
    </div>
  );
}
