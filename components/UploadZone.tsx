"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, File, Check, AlertCircle, X } from "lucide-react";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
  targetRole?: string;
  onTargetRoleChange?: (role: string) => void;
}

const TARGET_ROLES = [
  "General / Fresher",
  "SDE / Software Engineer",
  "Data Science / ML",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps / Cloud",
];

export default function UploadZone({
  onFileSelect,
  selectedFile,
  onClearFile,
  targetRole = "General / Fresher",
  onTargetRoleChange,
}: UploadZoneProps) {
  const [isHovered, setIsHovered] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        if (file.size > 5 * 1024 * 1024) {
          return;
        }
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const hasError = fileRejections.length > 0;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Neo-brutalist Card Container */}
      <div
        className="bg-white border-4 border-[#1a1a1a] p-6 sm:p-10 relative"
        style={{ boxShadow: '8px 8px 0px #1a1a1a' }}
      >
        {/* Upload Zone */}
        <div
          {...getRootProps()}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`
            relative border-4 border-dashed rounded-none transition-all duration-100 cursor-pointer
            ${isDragActive
              ? "border-[#e8441a] bg-[#e8441a]/5"
              : "border-[#1a1a1a] bg-white"
            }
            ${isHovered ? "border-[#e8441a]" : ""}
            ${hasError ? "border-red-500 bg-red-50" : ""}
            p-8 sm:p-12
          `}
        >
          <input {...getInputProps()} />

          {/* Animated Border - neo-brutalist style */}
          {(isDragActive || isHovered) && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "#e8441a",
                opacity: 0.1,
              }}
            />
          )}

          <AnimatePresence mode="wait">
            {selectedFile ? (
              <motion.div
                key="file-selected"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative z-10 flex flex-col items-center gap-4"
              >
                <div
                  className="w-16 h-16 bg-green-100 flex items-center justify-center border-4 border-green-600"
                >
                  <Check className="w-8 h-8 text-green-600" />
                </div>

                <div className="text-center">
                  <p className="text-[#1a1a1a] font-bold flex items-center gap-2 justify-center">
                    <File className="w-4 h-4 text-[#e8441a]" />
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-[#6b6b6b] mt-1 font-bold">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>

                <motion.button
                  whileHover={{
                    x: 1,
                    y: 1,
                    boxShadow: '1px 1px 0px #1a1a1a'
                  }}
                  whileTap={{
                    x: 2,
                    y: 2,
                    boxShadow: '0px 0px 0px #1a1a1a'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearFile();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-red-600
                           border-3 border-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                  style={{ boxShadow: '2px 2px 0px #ef4444' }}
                >
                  <X className="w-4 h-4" />
                  Remove file
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="upload-prompt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative z-10 flex flex-col items-center gap-4"
              >
                <motion.div
                  animate={{
                    y: isDragActive ? [0, -5, 0] : [0, -3, 0],
                  }}
                  transition={{
                    duration: isDragActive ? 0.3 : 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-16 h-16 bg-[#f0ede8] flex items-center justify-center border-4 border-[#1a1a1a]"
                  style={{ boxShadow: '3px 3px 0px #1a1a1a' }}
                >
                  <Upload
                    className={`w-8 h-8 transition-colors ${
                      isDragActive ? "text-[#e8441a]" : "text-[#1a1a1a]"
                    }`}
                  />
                </motion.div>

                <div className="text-center">
                  <p className="text-[#1a1a1a] font-bold text-lg">
                    {isDragActive
                      ? "Drop your resume here!"
                      : "Drop your resume PDF here"}
                  </p>
                  <p className="text-sm text-[#6b6b6b] mt-1 font-bold">
                    or click to browse files
                  </p>
                  <p className="text-xs text-[#6b6b6b]/60 mt-2 font-mono">
                    PDF only, max 5MB
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Target Role Dropdown */}
        <div className="mt-6">
          <label className="block text-sm font-bold text-[#1a1a1a] mb-2 font-mono">
            Target Role (Optional)
          </label>
          <select
            value={targetRole}
            onChange={(e) => onTargetRoleChange?.(e.target.value)}
            className="w-full px-4 py-3 bg-white text-[#1a1a1a] font-bold
                     border-4 border-[#1a1a1a] focus:outline-none focus:ring-0
                     cursor-pointer appearance-none"
            style={{
              boxShadow: '4px 4px 0px #1a1a1a',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%231a1a1a' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: '48px',
            }}
          >
            {TARGET_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Messages */}
      <AnimatePresence>
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 flex items-center gap-2 text-red-600 text-sm font-bold bg-red-50 border-3 border-red-600 p-3"
            style={{ boxShadow: '3px 3px 0px #ef4444' }}
          >
            <AlertCircle className="w-4 h-4" />
            <span>
              {fileRejections[0]?.errors[0]?.code === "file-too-large"
                ? "File size exceeds 5MB limit"
                : "Please upload a valid PDF file"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
