'use client';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-10 rounded-sm border-2 border-black px-4 text-sm font-medium text-black hover:bg-black hover:text-white"
    >
      הדפסה
    </button>
  );
}
