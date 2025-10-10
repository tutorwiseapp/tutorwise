'use client';

/**
 * TEST PAGE - Diagnose why Tailwind styles aren't applying to listing wizard
 */

export default function TestStylesPage() {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-gray-50" data-test-page="v2-fixed">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Test 1: Progress Dots */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-4">Test 1: Progress Dots</h2>
          <div className="flex justify-center items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-teal-600 scale-125" />
            <div className="w-12 h-0.5 bg-teal-600" />
            <div className="w-3 h-3 rounded-full bg-teal-600" />
            <div className="w-12 h-0.5 bg-gray-300" />
            <div className="w-3 h-3 rounded-full bg-gray-300" />
          </div>
        </div>

        {/* Test 2: Centered Text */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Large Centered Heading</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            This paragraph should be centered with max-width constraint
          </p>
        </div>

        {/* Test 3: Form Elements */}
        <div className="max-w-3xl mx-auto space-y-8">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Test Input <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Test input with teal focus ring"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Test Textarea
            </label>
            <textarea
              placeholder="Test textarea"
              rows={4}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>
        </div>

        {/* Test 4: Button */}
        <div className="mt-12 flex justify-center">
          <button className="bg-teal-700 hover:bg-teal-800 text-white px-8 py-3 rounded-lg font-medium">
            Test Button
          </button>
        </div>

        {/* Debug Info */}
        <div className="mt-16 p-4 bg-yellow-100 border border-yellow-400 rounded">
          <h3 className="font-bold mb-2">Debug Info:</h3>
          <ul className="text-sm space-y-1">
            <li>If you see styled elements above, Tailwind is working</li>
            <li>If elements are unstyled, there&apos;s a Tailwind config or build issue</li>
            <li>Check browser dev tools for: data-test-page=&quot;v1&quot;</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
