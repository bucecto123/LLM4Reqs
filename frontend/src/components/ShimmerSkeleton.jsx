import React from "react";

// Re-export all skeletons with shimmer animation replacing animate-pulse
// The shimmer uses a sliding gradient for a premium skeleton feel

export const ShimmerDiv = ({ className = "", style = {}, ...props }) => (
  <div
    className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer ${className}`}
    style={{ ...style }}
    {...props}
  />
);

export const ShimmerSkeleton = ({ className = "", ...props }) => (
  <ShimmerDiv className={`rounded ${className}`} {...props} />
);

export const ProjectDetailSkeleton = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Skeleton */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <ShimmerSkeleton className="h-8 w-3/4 mb-2" />
          <ShimmerSkeleton className="h-4 w-1/2" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <ShimmerSkeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <ShimmerSkeleton className="h-8 w-1/4 mb-2" />
          <ShimmerSkeleton className="h-4 w-1/3" />
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-md ${
                  i % 2 === 0 ? "bg-blue-100" : "bg-gray-200"
                } rounded-lg p-4`}
              >
                <ShimmerSkeleton className="h-4 w-full mb-2" />
                <ShimmerSkeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <ShimmerSkeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
};

export const MessagesSkeleton = () => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-md ${
              i % 2 === 0 ? "bg-blue-100" : "bg-gray-200"
            } rounded-lg p-4 w-80`}
          >
            <ShimmerSkeleton className="h-4 w-full mb-2" />
            <ShimmerSkeleton className="h-4 w-3/4 mb-2" />
            <ShimmerSkeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const DocumentsSkeleton = () => {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <ShimmerSkeleton className="h-6 w-3/4 mb-2" />
            <ShimmerSkeleton className="h-4 w-1/2 mb-3" />
            <ShimmerSkeleton className="h-4 w-full mb-2" />
            <ShimmerSkeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const ConversationsSkeleton = () => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <ShimmerSkeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
};

export const RequirementsSkeleton = () => {
  return (
    <div className="p-6 space-y-4">
      <ShimmerSkeleton className="h-8 w-1/4 mb-4" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
          <ShimmerSkeleton className="h-6 w-1/4 mb-2" />
          <ShimmerSkeleton className="h-4 w-full mb-2" />
          <ShimmerSkeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
};

export const DashboardSkeleton = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Skeleton */}
      <div className="w-64 bg-white flex flex-col border-r border-gray-200">
        {/* Sidebar Header */}
        <div
          className="px-4 py-5 flex items-center justify-between"
          style={{ borderBottom: "1px solid #E2E8F0" }}
        >
          <div className="flex items-center space-x-3">
            <ShimmerSkeleton className="w-10 h-10 rounded-lg" />
            <ShimmerSkeleton className="h-5 w-16" />
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <ShimmerSkeleton className="h-11 w-full" />
        </div>

        {/* Navigation */}
        <div className="px-4 space-y-1">
          <ShimmerSkeleton className="h-10 w-full" />
          <ShimmerSkeleton className="h-10 w-full" />
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-4 mt-4 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <ShimmerSkeleton key={i} className="h-14 w-full" />
          ))}
        </div>

        {/* Account Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <ShimmerSkeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1">
              <ShimmerSkeleton className="h-4 w-20 mb-1" />
              <ShimmerSkeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area Skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="py-5 px-6 bg-gradient-to-r from-slate-50 to-gray-50"
          style={{ borderBottom: "1px solid #E2E8F0" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <ShimmerSkeleton className="h-8 w-32" />
              <ShimmerSkeleton className="h-5 w-24" />
            </div>
          </div>
        </header>

        {/* Welcome Screen or Messages */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-2xl">
            <ShimmerSkeleton className="w-20 h-20 rounded-full mx-auto mb-6" />
            <ShimmerSkeleton className="h-8 w-64 mx-auto mb-4" />
            <ShimmerSkeleton className="h-4 w-96 mx-auto mb-2" />
            <ShimmerSkeleton className="h-4 w-80 mx-auto" />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <ShimmerSkeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
