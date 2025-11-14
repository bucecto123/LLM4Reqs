import React from "react";

export const ProjectDetailSkeleton = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Skeleton */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col animate-pulse">
        <div className="p-4 border-b border-gray-200">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col animate-pulse">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex ${
                i % 2 === 0 ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-md ${
                  i % 2 === 0 ? "bg-blue-100" : "bg-gray-200"
                } rounded-lg p-4`}
              >
                <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="h-12 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
};

export const MessagesSkeleton = () => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 animate-pulse">
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
            <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const DocumentsSkeleton = () => {
  return (
    <div className="p-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ConversationsSkeleton = () => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
      ))}
    </div>
  );
};

export const RequirementsSkeleton = () => {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
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
          <div className="flex items-center space-x-3 animate-pulse">
            <div className="w-10 h-10 rounded-lg bg-gray-300"></div>
            <div className="h-5 bg-gray-300 rounded w-16"></div>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4 animate-pulse">
          <div className="h-11 bg-gray-200 rounded-lg"></div>
        </div>

        {/* Navigation */}
        <div className="px-4 space-y-1 animate-pulse">
          <div className="h-10 bg-gray-200 rounded-lg"></div>
          <div className="h-10 bg-gray-200 rounded-lg"></div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-4 mt-4 space-y-2 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-gray-200 rounded-lg"></div>
          ))}
        </div>

        {/* Account Section */}
        <div className="p-4 border-t border-gray-200 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gray-300"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-300 rounded w-20 mb-1"></div>
              <div className="h-3 bg-gray-300 rounded w-12"></div>
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
          <div className="flex items-center justify-between animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="h-8 bg-gray-200 rounded-lg w-32"></div>
              <div className="h-5 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        </header>

        {/* Welcome Screen or Messages */}
        <div className="flex-1 flex items-center justify-center p-6 animate-pulse">
          <div className="text-center max-w-2xl">
            <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-6"></div>
            <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-80 mx-auto"></div>
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white animate-pulse">
          <div className="max-w-4xl mx-auto">
            <div className="h-12 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
