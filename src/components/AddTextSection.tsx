// src/components/AddTextSection.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Text = {
  id: string;
  title: string;
  author?: string;
  text_documents: Array<{
    id: string;
    meta?: { filename?: string };
    source_type: string;
  }>;
};

type TextSection = {
  id: string;
  start_line: number | null;
  end_line: number | null;
  start_char: number | null;
  end_char: number | null;
  title?: string;
  order_index: number;
  text_document_id: string;
  text_documents: {
    id: string;
    meta?: { filename?: string };
    text_id: string;
    texts?: {
      id: string;
      title: string;
      author?: string;
    } | null;
  };
};

type AssessmentModule = {
  id: string;
  title: string;
  description: string | null;
  question_type: 'definition' | 'socratic' | 'multiple_choice' | 'short_answer';
  order_index: number;
};

type CourseItem = 
  | { type: 'text_section'; data: TextSection }
  | { type: 'assessment_module'; data: AssessmentModule };

type Props = {
  courseSlug: string;
};

export default function AddTextSection({ courseSlug }: Props) {
  const router = useRouter();
  const [texts, setTexts] = useState<Text[]>([]);
  const [sections, setSections] = useState<TextSection[]>([]);
  const [assessmentModules, setAssessmentModules] = useState<AssessmentModule[]>([]);
  const [items, setItems] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState<string>('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [rangeType, setRangeType] = useState<'entire' | 'range'>('range');
  const [startBlock, setStartBlock] = useState<string>('');
  const [endBlock, setEndBlock] = useState<string>('');
  const [sectionTitle, setSectionTitle] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [blockCount, setBlockCount] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [initialItemsSnapshot, setInitialItemsSnapshot] = useState<CourseItem[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const itemsRef = useRef<CourseItem[]>(items);
  const dropHandledRef = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Combine sections and assessment modules into unified items array
  useEffect(() => {
    const combined: CourseItem[] = [
      ...sections.map(s => ({ type: 'text_section' as const, data: s })),
      ...assessmentModules.map(m => ({ type: 'assessment_module' as const, data: m }))
    ];
    // Sort by order_index
    combined.sort((a, b) => a.data.order_index - b.data.order_index);
    setItems(combined);
  }, [sections, assessmentModules]);

  // Load available texts and existing sections
  useEffect(() => {
    loadData();
  }, [courseSlug]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // Load available texts
      const textsRes = await fetch(`/admin/courses/${courseSlug}/available-texts`);
      const textsData = await textsRes.json();
      if (!textsRes.ok) {
        throw new Error(textsData.error || 'Failed to load texts');
      }
      setTexts(textsData.texts || []);

      // Load existing sections
      const sectionsRes = await fetch(`/admin/courses/${courseSlug}/text-sections`);
      const sectionsData = await sectionsRes.json();
      if (!sectionsRes.ok) {
        throw new Error(sectionsData.error || 'Failed to load sections');
      }
      setSections(sectionsData.sections || []);

      // Load assessment modules
      const modulesRes = await fetch(`/admin/courses/${courseSlug}/assessment-modules/api`);
      const modulesData = await modulesRes.json();
      if (!modulesRes.ok) {
        throw new Error(modulesData.error || 'Failed to load assessment modules');
      }
      setAssessmentModules(modulesData.modules || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDocumentId || !startBlock || !endBlock) {
      setError('Please fill in all required fields');
      return;
    }

    const start = parseInt(startBlock, 10);
    let end: number;

    // Handle "Last" in end block
    if (endBlock.toLowerCase() === 'last') {
      if (!blockCount) {
        // Fetch block count if not already available
        try {
          const res = await fetch(`/admin/texts/${selectedTextId}/documents/${selectedDocumentId}/preview/api`);
          const data = await res.json();
          if (res.ok && data.blockCount) {
            end = data.blockCount;
            setBlockCount(data.blockCount);
          } else {
            setError('Could not determine block count. Please enter a number.');
            return;
          }
        } catch (err) {
          setError('Could not determine block count. Please enter a number.');
          return;
        }
      } else {
        end = blockCount;
      }
    } else {
      end = parseInt(endBlock, 10);
      if (isNaN(end)) {
        setError('End block must be a number or "Last"');
        return;
      }
    }

    if (isNaN(start) || start < 1 || end < start) {
      setError('Invalid block range (blocks start at 1)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Use API endpoint to extract character ranges server-side
      const extractRes = await fetch(
        `/admin/texts/${selectedTextId}/documents/${selectedDocumentId}/preview/api/extract-char-ranges`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startBlock: start,
            endBlock: end,
          }),
        }
      );

      const extractData = await extractRes.json();

      if (!extractRes.ok) {
        throw new Error(extractData.error || 'Could not extract character range');
      }

      const charRange = {
        start_char: extractData.start_char,
        end_char: extractData.end_char,
      };

      const res = await fetch(`/admin/courses/${courseSlug}/text-sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_document_id: selectedDocumentId,
          start_char: charRange.start_char,
          end_char: charRange.end_char,
          title: sectionTitle || null,
          order_index: items.length,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to add text section');
      }

      // Reset form and reload data
      setSelectedTextId('');
      setSelectedDocumentId('');
      setRangeType('range');
      setStartBlock('');
      setEndBlock('');
      setSectionTitle('');
      setBlockCount(null);
      setShowAddForm(false);
      await loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to add text section');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(sectionId: string) {
    if (!confirm('Are you sure you want to remove this text section from the course?')) {
      return;
    }

    try {
      const res = await fetch(`/admin/courses/${courseSlug}/text-sections/${sectionId}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to delete text section');
      }

      await loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete text section');
    }
  }

  async function handleDeleteAssessmentModule(moduleId: string) {
    if (!confirm('Are you sure you want to remove this assessment module from the course?')) {
      return;
    }

    try {
      const res = await fetch(`/admin/courses/${courseSlug}/assessment-modules/${moduleId}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to delete assessment module');
      }

      await loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete assessment module');
    }
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index);
    setInitialItemsSnapshot(items.map(item => ({ ...item })));
    setIsDragging(true);
    dropHandledRef.current = false;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex === null || draggedIndex === index) {
      setDragOverIndex(index);
      return;
    }

    setItems(prevItems => {
      const newItems = [...prevItems];
      const [draggedItem] = newItems.splice(draggedIndex, 1);
      newItems.splice(index, 0, draggedItem);
      itemsRef.current = newItems;
      return newItems;
    });

    setDraggedIndex(index);
    setDragOverIndex(index);
  }

  function handleDragLeave(e: React.DragEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  }

  async function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
    dropHandledRef.current = true;

    if (draggedIndex === null) {
      setDraggedIndex(null);
      setIsDragging(false);
      return;
    }

    // Update order_index for all affected items
    const updates: Promise<void>[] = [];
    const currentItems = itemsRef.current;

    currentItems.forEach((item, index) => {
      if (item.data.order_index !== index) {
        if (item.type === 'text_section') {
          updates.push(
            fetch(`/admin/courses/${courseSlug}/text-sections/${item.data.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order_index: index }),
            }).then(async (res) => {
              const json = await res.json();
              if (!res.ok) {
                throw new Error(json.error || 'Failed to update section order');
              }
            })
          );
        } else if (item.type === 'assessment_module') {
          updates.push(
            fetch(`/admin/courses/${courseSlug}/assessment-modules/${item.data.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order_index: index }),
            }).then(async (res) => {
              const json = await res.json();
              if (!res.ok) {
                throw new Error(json.error || 'Failed to update assessment module order');
              }
            })
          );
        }
      }
    });

    try {
      setDraggedIndex(null);
      setIsDragging(false);
      await Promise.all(updates);
      await loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to reorder items');
      await loadData();
    } finally {
      setDraggedIndex(null);
      setInitialItemsSnapshot(null);
      setIsDragging(false);
    }
  }

  function handleDragEnd() {
    if (!dropHandledRef.current && initialItemsSnapshot) {
      const snapshotClone = initialItemsSnapshot.map(item => ({ ...item }));
      setItems(snapshotClone);
      itemsRef.current = snapshotClone;
    }
    dropHandledRef.current = false;
    setDraggedIndex(null);
    setDragOverIndex(null);
    setInitialItemsSnapshot(null);
    setIsDragging(false);
  }

  // Get documents for selected text
  const selectedText = texts.find(t => t.id === selectedTextId);
  const availableDocuments = selectedText?.text_documents || [];

  if (loading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="border rounded p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sections</h3>
        {!showAddForm && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(true)}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Text Section
            </button>
            <Link
              href={`/admin/assessment-modules/new?course_slug=${courseSlug}`}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block"
            >
              + Add Assessment Module
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
          {error}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select Text</label>
            <select
              value={selectedTextId}
              onChange={(e) => {
                setSelectedTextId(e.target.value);
                setSelectedDocumentId(''); // Reset document when text changes
              }}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">-- Select a text --</option>
              {texts.map((text) => (
                <option key={text.id} value={text.id}>
                  {text.title} {text.author && `by ${text.author}`}
                </option>
              ))}
            </select>
          </div>

          {selectedTextId && (
            <div>
              <label className="block text-sm font-medium mb-1">Select Document</label>
              <select
                value={selectedDocumentId}
                onChange={async (e) => {
                  setSelectedDocumentId(e.target.value);
                  setBlockCount(null);
                  // Reset form when document changes
                  if (rangeType === 'entire') {
                    setStartBlock('1');
                    setEndBlock('');
                  } else {
                    setStartBlock('');
                    setEndBlock('');
                  }
                  // Fetch block count for the selected document
                  if (e.target.value && selectedTextId) {
                    try {
                      const res = await fetch(`/admin/texts/${selectedTextId}/documents/${e.target.value}/preview/api`);
                      const data = await res.json();
                      if (res.ok && data.blockCount) {
                        setBlockCount(data.blockCount);
                        if (rangeType === 'entire') {
                          setEndBlock(String(data.blockCount));
                        }
                      }
                    } catch (err) {
                      console.error('Failed to fetch block count:', err);
                    }
                  }
                }}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">-- Select a document --</option>
                {availableDocuments.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.meta?.filename || `Document (${doc.source_type})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="rangeType"
                  value="entire"
                  checked={rangeType === 'entire'}
                  onChange={(e) => {
                    setRangeType('entire');
                    if (selectedDocumentId && blockCount) {
                      setStartBlock('1');
                      setEndBlock(String(blockCount));
                    } else {
                      setStartBlock('1');
                      setEndBlock('');
                    }
                  }}
                  className="w-4 h-4"
                />
                <span>Entire Text</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="rangeType"
                  value="range"
                  checked={rangeType === 'range'}
                  onChange={(e) => {
                    setRangeType('range');
                    setStartBlock('');
                    setEndBlock('');
                  }}
                  className="w-4 h-4"
                />
                <span>Range</span>
              </label>
            </div>

            {selectedTextId && selectedDocumentId && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-2">
                  Open the <a href={`/admin/texts/${selectedTextId}/documents/${selectedDocumentId}/preview`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Display Preview</a> to see block numbers.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Start Block</label>
                <input
                  type="number"
                  value={startBlock}
                  onChange={(e) => setStartBlock(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  min="1"
                  disabled={rangeType === 'entire'}
                  required
                />
                {blockCount && (
                  <p className="text-xs text-gray-500 mt-1">
                    {startBlock ? `Block ${Number(startBlock).toLocaleString()}` : 'Start block'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Block</label>
                <input
                  type="text"
                  value={endBlock}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow numbers or "Last" (case-insensitive)
                    if (value === '' || /^\d+$/.test(value) || /^[lL][aA]?[sS]?[tT]?$/.test(value)) {
                      setEndBlock(value);
                    }
                  }}
                  className="w-full border rounded px-3 py-2"
                  disabled={rangeType === 'entire'}
                  placeholder={rangeType === 'entire' ? '' : 'e.g., 150 or Last'}
                  required
                />
                {blockCount && (
                  <p className="text-xs text-gray-500 mt-1">
                    {endBlock && endBlock.toLowerCase() !== 'last' 
                      ? `Block ${Number(endBlock).toLocaleString()}${endBlock && startBlock ? ` (${(Number(endBlock) - Number(startBlock) + 1).toLocaleString()} blocks)` : ''}`
                      : `Total: ${blockCount.toLocaleString()} blocks`}
                  </p>
                )}
              </div>
            </div>
            {blockCount && (
              <p className="text-sm text-gray-600 mt-2">
                Document has {blockCount.toLocaleString()} block{blockCount === 1 ? '' : 's'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Section Title (optional)</label>
            <input
              type="text"
              value={sectionTitle}
              onChange={(e) => setSectionTitle(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., Chapter 1, Introduction"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Section'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setError(null);
                setSelectedTextId('');
                setSelectedDocumentId('');
                setRangeType('range');
                setStartBlock('');
                setEndBlock('');
                setSectionTitle('');
                setBlockCount(null);
              }}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {items.length > 0 && (
        <div className="border-t pt-4">
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li
                key={`${item.type}-${item.data.id}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`group border rounded p-3 flex items-center gap-3 transition-all duration-150 ${
                  draggedIndex === index ? 'opacity-30 scale-95' : ''
                } ${
                  dragOverIndex === index && draggedIndex !== index
                    ? 'border-blue-500 bg-blue-50 border-2 transform scale-[1.02]'
                    : draggedIndex !== null && draggedIndex !== index
                    ? 'hover:bg-gray-50'
                    : 'hover:bg-gray-50'
                } ${item.type === 'assessment_module' ? 'bg-purple-50 border-purple-200' : ''}`}
              >
                <div className="flex-shrink-0 text-gray-400 cursor-grab active:cursor-grabbing">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                    <line x1="15" y1="3" x2="15" y2="21"></line>
                  </svg>
                </div>
                <div className="flex-1 space-y-2">
                  {item.type === 'text_section' ? (
                    <>
                      {(() => {
                        const section = item.data;
                        const rangeLabel =
                          section.start_char !== null && section.end_char !== null
                            ? `Chars ${section.start_char.toLocaleString()}-${section.end_char.toLocaleString()}`
                            : section.start_line !== null && section.end_line !== null
                            ? `Lines ${section.start_line}-${section.end_line}`
                            : 'Range not specified';
                        const textTitle = section.text_documents.texts?.title;
                        const textAuthor = section.text_documents.texts?.author;
                        const filename = section.text_documents.meta?.filename || 'Document';
                        return (
                          <>
                            <div className="font-medium text-gray-500 group-hover:text-black transition-colors">
                              {section.title || `${textTitle || 'Untitled'} (${rangeLabel})`}
                            </div>
                            <div className="text-sm text-gray-600">
                              {textTitle}
                              {textAuthor && ` by ${textAuthor}`}
                              {' • '}
                              {filename}
                              {' • '}
                              {rangeLabel}
                            </div>
                          </>
                        );
                      })()}
                      <div className="flex flex-wrap gap-4 text-sm text-blue-600">
                        <Link
                          href={`/admin/courses/${courseSlug}/text-sections/${item.data.id}/preview/display`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          Preview Display
                        </Link>
                        <Link
                          href={`/admin/courses/${courseSlug}/text-sections/${item.data.id}/preview/rag`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          Preview RAG
                        </Link>
                        <Link
                          href={`/admin/courses/${courseSlug}/text-sections/${item.data.id}/edit`}
                          className="hover:underline"
                        >
                          Edit Metadata
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.data.id)}
                          className="text-red-600 hover:underline"
                        >
                          Remove Text
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-medium text-purple-700 group-hover:text-purple-900 transition-colors">
                        📝 {item.data.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        Assessment Module • {item.data.question_type.replace('_', ' ')}
                        {item.data.description && ` • ${item.data.description}`}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-blue-600">
                        <Link
                          href={`/admin/assessment-modules/${item.data.id}/edit`}
                          className="hover:underline"
                        >
                          Edit Assessment Module
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteAssessmentModule(item.data.id)}
                          className="text-red-600 hover:underline"
                        >
                          Remove Assessment Module
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div
                  className="flex items-center gap-2 flex-shrink-0 text-gray-400 px-1 select-none leading-none"
                  style={{ cursor: draggedIndex === index ? 'grabbing' : 'grab', fontSize: '2.3rem' }}
                  aria-hidden="true"
                >
                  ⇕
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length === 0 && !showAddForm && (
        <div className="text-sm text-gray-500 text-center py-4">
          No sections or assessment modules added yet. Click "Add Text Section" or "Add Assessment Module" to get started.
        </div>
      )}
    </div>
  );
}

