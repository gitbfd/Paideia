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
  start_block: number | null;
  end_block: number | null;
  title?: string;
  order_index: number;
  text_document_id: string;
  text_documents: {
    id: string;
    meta?: { filename?: string };
    display_content?: string | null;
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
  courseId: string;
};

type AmQuestionType = 'definition' | 'socratic' | 'multiple_choice' | 'short_answer';

/**
 * Formats a range label, prioritizing stored block numbers
 */
function formatRangeLabel(
  section: TextSection
): string {
  // Use stored block numbers if available (preferred)
  // Check both for null/undefined and that they're valid numbers
  if (
    section.start_block !== null && 
    section.start_block !== undefined &&
    section.end_block !== null && 
    section.end_block !== undefined &&
    typeof section.start_block === 'number' &&
    typeof section.end_block === 'number'
  ) {
    return `Blocks ${section.start_block.toLocaleString()}-${section.end_block.toLocaleString()}`;
  }

  // Fallback to character range
  if (section.start_char !== null && section.end_char !== null) {
    return `Chars ${section.start_char.toLocaleString()}-${section.end_char.toLocaleString()}`;
  }

  // Fallback to line range
  if (section.start_line !== null && section.end_line !== null) {
    return `Lines ${section.start_line}-${section.end_line}`;
  }

  return 'Range not specified';
}

export default function AddTextSection({ courseSlug, courseId }: Props) {
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [isEditOrderMode, setIsEditOrderMode] = useState(false);
  const [originalOrder, setOriginalOrder] = useState<CourseItem[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const itemsRef = useRef<CourseItem[]>(items);
  const dropHandledRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [showAmAddForm, setShowAmAddForm] = useState(false);
  const [amSource, setAmSource] = useState<'course' | 'template'>('course');
  const [amTemplates, setAmTemplates] = useState<Array<{ id: string; title: string }>>([]);
  const [amSelectedTemplateId, setAmSelectedTemplateId] = useState('');
  const [amTitle, setAmTitle] = useState('');
  const [amDescription, setAmDescription] = useState('');
  const [amQuestionType, setAmQuestionType] = useState<AmQuestionType>('short_answer');
  const [amQuestionCount, setAmQuestionCount] = useState(5);
  const [amQuestionPrompt, setAmQuestionPrompt] = useState('');
  const [amDifficulty, setAmDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [amOrderIndex, setAmOrderIndex] = useState(0);
  const [amSubmitting, setAmSubmitting] = useState(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (showEditOrderModal) {
      dialog.showModal();
    } else {
      dialog.close();
    }
    const onClose = () => setShowEditOrderModal(false);
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, [showEditOrderModal]);

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

  async function calculateNextAmOrderIndex() {
    try {
      const [sectionsRes, modulesRes] = await Promise.all([
        fetch(`/admin/courses/${courseSlug}/text-sections`),
        fetch(`/admin/courses/${courseSlug}/assessment-modules/api`),
      ]);
      const sectionsData = await sectionsRes.json();
      const modulesData = await modulesRes.json();
      const allOrderIndices = [
        ...(sectionsData.sections || []).map((s: { order_index: number }) => s.order_index),
        ...(modulesData.modules || []).map((m: { order_index: number }) => m.order_index),
      ];
      const maxOrderIndex =
        allOrderIndices.length > 0 ? Math.max(...allOrderIndices) : -1;
      setAmOrderIndex(maxOrderIndex + 1);
    } catch {
      setAmOrderIndex(0);
    }
  }

  async function openAmAddForm() {
    setShowAmAddForm(true);
    setShowAddForm(false);
    setAmSource('course');
    setAmSelectedTemplateId('');
    setAmTitle('');
    setAmDescription('');
    setAmQuestionType('short_answer');
    setAmQuestionCount(5);
    setAmQuestionPrompt('');
    setAmDifficulty('medium');
    setError(null);
    await calculateNextAmOrderIndex();
    try {
      const res = await fetch('/admin/assessment-module-templates/api');
      const data = await res.json();
      if (res.ok && Array.isArray(data.templates)) {
        setAmTemplates(
          data.templates.map((t: { id: string; title: string }) => ({
            id: t.id,
            title: t.title,
          }))
        );
      } else {
        setAmTemplates([]);
      }
    } catch {
      setAmTemplates([]);
    }
  }

  useEffect(() => {
    if (!showAmAddForm || amSource !== 'template' || !amSelectedTemplateId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/admin/assessment-module-templates/api?id=${encodeURIComponent(amSelectedTemplateId)}`
        );
        const data = await res.json();
        if (cancelled || !res.ok || !data.template) return;
        const t = data.template;
        setAmTitle(t.title ?? '');
        setAmDescription(t.description ?? '');
        setAmQuestionType(t.question_type ?? 'short_answer');
        const cfg = (t.config as Record<string, unknown>) || {};
        setAmQuestionCount(Number(cfg.question_count) || 5);
        setAmQuestionPrompt(String(cfg.question_prompt ?? ''));
        const d = cfg.difficulty;
        setAmDifficulty(
          d === 'easy' || d === 'hard' || d === 'medium' ? d : 'medium'
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showAmAddForm, amSource, amSelectedTemplateId]);

  async function handleSubmitAssessmentModule(e: React.FormEvent) {
    e.preventDefault();
    if (!amTitle.trim()) {
      setError('Assessment module title is required');
      return;
    }
    setAmSubmitting(true);
    setError(null);
    try {
      const config = {
        question_prompt: amQuestionPrompt || undefined,
        question_count: amQuestionCount,
        difficulty: amDifficulty,
        allow_multiple_attempts: true,
      };
      const body: Record<string, unknown> = {
        title: amTitle,
        description: amDescription || null,
        course_id: courseId,
        order_index: amOrderIndex,
        question_type: amQuestionType,
        config,
      };
      if (amSource === 'template' && amSelectedTemplateId) {
        body.template_id = amSelectedTemplateId;
      }
      const res = await fetch('/admin/assessment-modules/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create assessment module');
      }
      setShowAmAddForm(false);
      await loadData();
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to create assessment module'
      );
    } finally {
      setAmSubmitting(false);
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
          start_block: start,
          end_block: end,
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

    // Reorder items in UI
    const currentItems = [...itemsRef.current];
    const itemToMove = currentItems[draggedIndex];
    currentItems.splice(draggedIndex, 1);
    currentItems.splice(dropIndex, 0, itemToMove);
    
    setItems(currentItems);
    itemsRef.current = currentItems;
    setDraggedIndex(null);
    setInitialItemsSnapshot(null);
    setIsDragging(false);

    // If not in edit mode, save immediately (legacy behavior)
    if (!isEditOrderMode) {
      await handleDropWithSave(currentItems);
    }
  }

  async function handleDropWithSave(reorderedItems: CourseItem[]) {
    // Update order_index for all affected items
    const updates: Promise<void>[] = [];

    reorderedItems.forEach((item, index) => {
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
      await Promise.all(updates);
      await loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to reorder items');
      await loadData();
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

  function handleIndexChange(itemIndex: number, newDisplayIndex: number) {
    // Convert 1-based display index to 0-based order_index
    const newOrderIndex = newDisplayIndex - 1;
    
    // Validate: must be between 0 and items.length - 1
    if (newOrderIndex < 0 || newOrderIndex >= items.length) {
      setError(`Index must be between 1 and ${items.length}`);
      setEditingIndex(null);
      return;
    }

    const currentItems = [...items];
    const itemToMove = currentItems[itemIndex];
    
    // Remove item from current position
    currentItems.splice(itemIndex, 1);
    
    // Insert at new position
    currentItems.splice(newOrderIndex, 0, itemToMove);
    
    // Update UI optimistically (no API calls in edit mode)
    setItems(currentItems);
    itemsRef.current = currentItems;
    setEditingIndex(null);
    setError(null);
  }

  function handleIndexInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>, itemIndex: number) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = parseInt(editingValue, 10);
      if (!isNaN(value)) {
        handleIndexChange(itemIndex, value);
      } else {
        setEditingIndex(null);
      }
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
      setEditingValue('');
    }
  }

  function handleIndexInputBlur(itemIndex: number) {
    const value = parseInt(editingValue, 10);
    if (!isNaN(value)) {
      handleIndexChange(itemIndex, value);
    } else {
      setEditingIndex(null);
      setEditingValue('');
    }
  }

  function handleStartEditOrder() {
    // Save current order as snapshot for cancel
    setOriginalOrder(
      items.map((item): CourseItem =>
        item.type === 'text_section'
          ? { type: 'text_section', data: { ...item.data } }
          : { type: 'assessment_module', data: { ...item.data } }
      )
    );
    setIsEditOrderMode(true);
    setShowEditOrderModal(false);
    setError(null);
  }

  function handleIndexClick(itemIndex: number) {
    if (!isEditOrderMode) {
      // Show modal to enter edit mode
      setShowEditOrderModal(true);
    } else {
      // Already in edit mode, allow editing
      setEditingIndex(itemIndex);
      setEditingValue(String(itemIndex + 1));
    }
  }

  function handleCancelEditOrder() {
    // Revert to original order
    setItems(originalOrder);
    itemsRef.current = originalOrder;
    setIsEditOrderMode(false);
    setOriginalOrder([]);
    setEditingIndex(null);
    setEditingValue('');
    setError(null);
  }

  async function handleSaveOrderChanges() {
    setIsSavingOrder(true);
    setError(null);

    try {
      // Batch update all items that have changed order_index
      const updates: Promise<void>[] = [];
      
      items.forEach((item, index) => {
        // Check if order_index needs updating
        const originalItem = originalOrder.find(
          orig => orig.type === item.type && orig.data.id === item.data.id
        );
        const originalIndex = originalOrder.findIndex(
          orig => orig.type === item.type && orig.data.id === item.data.id
        );

        // Update if position changed
        if (originalIndex !== index) {
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

      await Promise.all(updates);
      
      // Exit edit mode and refresh data
      setIsEditOrderMode(false);
      setOriginalOrder([]);
      setEditingIndex(null);
      setEditingValue('');
      await loadData();
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save order changes');
    } finally {
      setIsSavingOrder(false);
    }
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
            {isEditOrderMode ? (
              <>
                <button
                  onClick={handleSaveOrderChanges}
                  disabled={isSavingOrder}
                  className="btn-success-sm"
                >
                  {isSavingOrder ? 'Saving...' : 'Save New Order'}
                </button>
                <button
                  onClick={handleCancelEditOrder}
                  disabled={isSavingOrder}
                  className="btn-outline btn-sm"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
            <button
              onClick={() => {
                setShowAddForm(true);
                setShowAmAddForm(false);
              }}
              disabled={isEditOrderMode}
              className="btn-primary-sm"
            >
              + Add Text Section
            </button>
                <button
                  type="button"
                  onClick={() => openAmAddForm()}
                  disabled={isEditOrderMode}
                  className="btn-primary-sm"
                >
                  + Add Assessment Module
                </button>
                <button
                  onClick={handleStartEditOrder}
                  className="btn-primary-sm"
                >
                  Edit Order
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
          {error}
        </div>
      )}

      {/* Edit Order Confirmation Modal - native HTML dialog */}
      <dialog
        ref={dialogRef}
        className="mx-auto max-w-md rounded-lg border-0 bg-white p-0 shadow-xl [&::backdrop]:bg-black/50"
        aria-labelledby="edit-order-modal-title"
        onCancel={() => setShowEditOrderModal(false)}
      >
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <h3 id="edit-order-modal-title" className="mb-4 text-lg font-semibold">
            Edit order of Course Sections and Assessment Modules?
          </h3>
          <p className="mb-6 text-sm text-gray-600">
            You&apos;ll be able to reorder sections and assessment modules. Changes will be saved when you click &quot;Save New Order&quot;.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowEditOrderModal(false)}
              className="btn-outline btn-md"
            >
              Cancel
            </button>
            <button
              onClick={handleStartEditOrder}
              className="btn-primary-md"
            >
              Yes
            </button>
          </div>
        </div>
      </dialog>

      {showAmAddForm && (
        <form
          onSubmit={handleSubmitAssessmentModule}
          className="space-y-3 border-t pt-4"
        >
          <h4 className="text-sm font-semibold text-gray-800">
            Add assessment module to this course
          </h4>
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Source</div>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="amSource"
                checked={amSource === 'course'}
                onChange={() => {
                  setAmSource('course');
                  setAmSelectedTemplateId('');
                }}
                className="w-4 h-4"
              />
              <span>Create course-specific assessment module</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="amSource"
                checked={amSource === 'template'}
                onChange={() => setAmSource('template')}
                className="w-4 h-4"
              />
              <span>Start from global assessment module template</span>
            </label>
          </div>

          {amSource === 'template' && (
            <div>
              <label className="block text-sm font-medium mb-1">Template</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={amSelectedTemplateId}
                onChange={(e) => setAmSelectedTemplateId(e.target.value)}
                required
              >
                <option value="">— Select a template —</option>
                {amTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              {amTemplates.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No templates yet. Create one under Assessment Module Templates in the sidebar.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={amTitle}
              onChange={(e) => setAmTitle(e.target.value)}
              required
              disabled={amSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              value={amDescription}
              onChange={(e) => setAmDescription(e.target.value)}
              rows={2}
              disabled={amSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Order index</label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2"
              value={amOrderIndex}
              onChange={(e) => setAmOrderIndex(Number(e.target.value) || 0)}
              disabled={amSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Question type *</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={amQuestionType}
              onChange={(e) =>
                setAmQuestionType(e.target.value as AmQuestionType)
              }
              disabled={amSubmitting}
            >
              <option value="short_answer">Short answer</option>
              <option value="definition">Definition</option>
              <option value="socratic">Socratic</option>
              <option value="multiple_choice">Multiple choice</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Question count</label>
            <input
              type="number"
              min={1}
              max={20}
              className="w-full border rounded px-3 py-2"
              value={amQuestionCount}
              onChange={(e) => setAmQuestionCount(Number(e.target.value) || 5)}
              disabled={amSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Difficulty</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={amDifficulty}
              onChange={(e) =>
                setAmDifficulty(e.target.value as 'easy' | 'medium' | 'hard')
              }
              disabled={amSubmitting}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Question generation prompt
            </label>
            <textarea
              className="w-full border rounded px-3 py-2"
              value={amQuestionPrompt}
              onChange={(e) => setAmQuestionPrompt(e.target.value)}
              rows={3}
              disabled={amSubmitting}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={
                amSubmitting ||
                (amSource === 'template' &&
                  (!amSelectedTemplateId || amTemplates.length === 0))
              }
              className="btn-primary-md"
            >
              {amSubmitting ? 'Adding…' : 'Add assessment module'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAmAddForm(false);
                setError(null);
              }}
              className="btn-outline btn-md"
              disabled={amSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
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
              className="btn-primary-md"
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
              className="btn-outline btn-md"
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
                draggable={isEditOrderMode}
                onDragStart={isEditOrderMode ? (e) => handleDragStart(e, index) : undefined}
                onDragOver={isEditOrderMode ? (e) => handleDragOver(e, index) : undefined}
                onDragLeave={isEditOrderMode ? handleDragLeave : undefined}
                onDrop={isEditOrderMode ? (e) => handleDrop(e, index) : undefined}
                onDragEnd={isEditOrderMode ? handleDragEnd : undefined}
                style={item.type === 'assessment_module' && dragOverIndex !== index && draggedIndex !== index 
                  ? { backgroundColor: '#111827' } // gray-900
                  : {}}
                className={`group border rounded p-3 flex items-center gap-3 transition-all duration-150 ${
                  isEditOrderMode ? '' : ''
                } ${
                  draggedIndex === index ? 'opacity-30 scale-95' : ''
                } ${
                  dragOverIndex === index && draggedIndex !== index
                    ? '!border-blue-500 !bg-blue-50 border-2 transform scale-[1.02]'
                    : ''
                }`}
              >
                {isEditOrderMode && (
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
                )}
                <div className="flex-1 space-y-2">
                  {item.type === 'text_section' ? (
                    <>
                      {(() => {
                        const section = item.data;
                        const rangeLabel = formatRangeLabel(section);
                        const textTitle = section.text_documents.texts?.title;
                        const textAuthor = section.text_documents.texts?.author;
                        const filename = section.text_documents.meta?.filename || 'Document';
                        return (
                          <>
                            <div className="font-medium text-gray-500">
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
                          className="btn-link-danger"
                        >
                          Remove Text
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-medium text-gray-500">
                        {item.data.title}
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
                          className="btn-link-danger"
                        >
                          Remove Assessment Module
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {editingIndex === index ? (
                    <input
                      type="number"
                      min="1"
                      max={items.length}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => handleIndexInputKeyDown(e, index)}
                      onBlur={() => handleIndexInputBlur(index)}
                      className="w-16 px-2 py-1 text-sm border rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleIndexClick(index)}
                      className="w-12 px-2 py-1 text-sm text-gray-700 border rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title={isEditOrderMode ? "Click to edit index" : "Click to edit order"}
                    >
                      {index + 1}
                    </button>
                  )}
                  {isEditOrderMode && (
                    <div
                      className="flex items-center gap-2 flex-shrink-0 text-white px-1 select-none leading-none"
                      style={{ cursor: draggedIndex === index ? 'grabbing' : 'grab', fontSize: '2.3rem' }}
                      aria-hidden="true"
                    >
                      ⇕
                    </div>
                  )}
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

