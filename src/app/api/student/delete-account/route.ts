// src/app/api/student/delete-account/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClientForRoute } from '@/lib/supabase/route';
import { createClientAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { supabase, applyCookies } = createClientForRoute(req);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return applyCookies(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      );
    }

    const userId = user.id;

    // Use admin client for deletions that require elevated permissions
    const admin = createClientAdmin();

    // 1. Delete avatar from storage if it exists
    const { data: profile } = await admin
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (profile?.avatar_url) {
      try {
        // Extract path from full URL (avatars/{userId}/filename)
        const urlParts = profile.avatar_url.split('/avatars/');
        if (urlParts.length > 1) {
          const storagePath = `${userId}/${urlParts[1]}`;
          await admin.storage
            .from('avatars')
            .remove([storagePath]);
        }
      } catch (storageError) {
        console.error('Error deleting avatar from storage:', storageError);
        // Continue with account deletion even if storage deletion fails
      }
    }

    // 2. Delete user's course enrollments
    await admin
      .from('course_enrollments')
      .delete()
      .eq('user_id', userId);

    // 3. Delete assessment sessions (cascades to questions and answers)
    await admin
      .from('assessment_sessions')
      .delete()
      .eq('user_id', userId);

    // 4. Courses are NOT deleted - they are decoupled from users
    // Courses persist independently and are not considered user data
    // The user_id field is kept for audit/historical tracking only

    // 5. Delete texts created by user (if any)
    // Note: This will cascade delete text_documents and text_document_chunks
    await admin
      .from('texts')
      .delete()
      .eq('user_id', userId);

    // 6. Remove from app_admins if they're an admin
    await admin
      .from('app_admins')
      .delete()
      .eq('user_id', userId);

    // 7. Delete profile (references auth.users, will be cleaned up when auth user is deleted)
    await admin
      .from('profiles')
      .delete()
      .eq('id', userId);

    // 8. Finally, delete the auth user
    // This must be done via Supabase Admin API
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError);
      return applyCookies(
        NextResponse.json(
          { error: `Failed to delete user account: ${deleteUserError.message}` },
          { status: 500 }
        )
      );
    }

    return applyCookies(
      NextResponse.json({ success: true, message: 'Account deleted successfully' })
    );
  } catch (error: any) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while deleting your account' },
      { status: 500 }
    );
  }
}
