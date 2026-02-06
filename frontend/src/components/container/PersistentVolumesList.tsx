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
          bg: "bg-green-500/10",
          text: "text-green-400",
          border: "border-green-500/20",
          icon: <Check className="w-4 h-4" />,
        };
      case "available":
        return {
          bg: "bg-blue-500/10",
          text: "text-blue-400",
          border: "border-blue-500/20",
          icon: <Clock className="w-4 h-4" />,
        };
      case "released":
        return {
          bg: "bg-amber-500/10",
          text: "text-amber-400",
          border: "border-amber-500/20",
          icon: <Clock className="w-4 h-4" />,
        };
      case "failed":
        return {
          bg: "bg-red-500/10",
          text: "text-red-400",
          border: "border-red-500/20",
          icon: <X className="w-4 h-4" />,
        };
      default:
        return {
          bg: "bg-zinc-800/50",
          text: "text-zinc-300",
          border: "border-zinc-800/50",
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
        <h3 className="text-lg font-medium text-white">
          Persistent Volumes ({volumes.length})
        </h3>
      </div>

      <div className="grid gap-3">
        {volumes.map((volume, index) => {
          const statusConfig = getStatusColor(volume.status);

          return (
            <div
              key={index}
              className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-4 hover:border-zinc-700/50 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-zinc-800/50 rounded-lg">
                    <Database className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-mono text-sm font-medium text-white truncate">
                        {volume.name}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {volume.capacity && (
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md font-medium border border-blue-500/20">
                          {volume.capacity}
                        </span>
                      )}
                      {volume.storageClass && (
                        <span className="text-zinc-400 font-light">
                          Class: {volume.storageClass}
                        </span>
                      )}
                      {volume.age && (
                        <span className="text-zinc-500 font-light">
                          {volume.age}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {volume.status && (
                  <div
                    className={`px-3 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                  >
                    {statusConfig.icon}
                    {volume.status}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {volume.accessModes && volume.accessModes.length > 0 && (
                  <div>
                    <div className="text-xs text-zinc-400 font-light mb-1">
                      Access Modes
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {volume.accessModes.map((mode, mIndex) => (
                        <span
                          key={mIndex}
                          className="px-2 py-0.5 bg-zinc-800/50 text-zinc-300 rounded text-xs font-mono border border-zinc-800/50"
                        >
                          {getAccessModeLabel(mode)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {volume.reclaimPolicy && (
                  <div>
                    <div className="text-xs text-zinc-400 font-light mb-1">
                      Reclaim Policy
                    </div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        volume.reclaimPolicy === "Retain"
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : volume.reclaimPolicy === "Delete"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-zinc-800/50 text-zinc-300 border border-zinc-800/50"
                      }`}
                    >
                      {volume.reclaimPolicy}
                    </span>
                  </div>
                )}

                {volume.volumeMode && (
                  <div>
                    <div className="text-xs text-zinc-400 font-light mb-1">
                      Volume Mode
                    </div>
                    <span className="text-zinc-300 text-xs">
                      {volume.volumeMode}
                    </span>
                  </div>
                )}

                {volume.claim && (
                  <div>
                    <div className="text-xs text-zinc-400 font-light mb-1">
                      Bound To
                    </div>
                    <code className="text-xs text-blue-400 font-mono">
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
        <div className="text-center py-8 text-zinc-500 font-light">
          <HardDrive className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No persistent volumes found</p>
        </div>
      )}
    </div>
  );
}
