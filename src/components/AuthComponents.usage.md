# Authentication UI Components Usage Guide

This guide explains how to use the `AuthModal` and `AuthGuard` components for implementing authentication in the AI Grocery Scanner application.

## Components Overview

### AuthModal
A modal dialog for user authentication (sign up and sign in) with email/password.

### AuthGuard
A wrapper component that protects routes and content by requiring authentication.

## Requirements Satisfied

- **Requirement 1.1**: Authenticate users using Supabase Auth
- **Requirement 1.5**: Prompt for authentication when user is not authenticated

## Usage Examples

### 1. Basic AuthModal Usage

```tsx
import { useState } from 'react';
import AuthModal from '@/components/AuthModal';

function MyComponent() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowAuthModal(true)}>
        Sign In
      </button>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          console.log('User authenticated successfully!');
          setShowAuthModal(false);
        }}
      />
    </>
  );
}
```

### 2. Basic AuthGuard Usage

```tsx
import AuthGuard from '@/components/AuthGuard';

function ProtectedPage() {
  return (
    <AuthGuard>
      <div>
        <h1>Protected Content</h1>
        <p>This content is only visible to authenticated users.</p>
      </div>
    </AuthGuard>
  );
}
```

### 3. AuthGuard with Custom Loading Component

```tsx
import AuthGuard from '@/components/AuthGuard';

function CustomLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
    </div>
  );
}

function ProtectedPage() {
  return (
    <AuthGuard loadingComponent={<CustomLoadingSpinner />}>
      <div>Protected Content</div>
    </AuthGuard>
  );
}
```

### 4. AuthGuard with Custom Fallback

```tsx
import AuthGuard from '@/components/AuthGuard';

function CustomAuthPrompt() {
  return (
    <div className="text-center p-8">
      <h2>Premium Feature</h2>
      <p>Sign in to access premium features</p>
      <button className="btn-primary">Get Started</button>
    </div>
  );
}

function PremiumFeature() {
  return (
    <AuthGuard 
      fallback={<CustomAuthPrompt />}
      showModal={false}
    >
      <div>Premium Content</div>
    </AuthGuard>
  );
}
```

### 5. Protecting Multiple Routes in Layout

```tsx
// app/dashboard/layout.tsx
import AuthGuard from '@/components/AuthGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="dashboard-layout">
        <nav>Dashboard Navigation</nav>
        <main>{children}</main>
      </div>
    </AuthGuard>
  );
}
```

### 6. Conditional Authentication Prompt

```tsx
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';

function ScanButton() {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleScan = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    // Proceed with scan
    performScan();
  };

  return (
    <>
      <button onClick={handleScan}>
        Scan Product
      </button>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          performScan();
        }}
      />
    </>
  );
}
```

### 7. Programmatic Authentication Check

```tsx
import { useAuth } from '@/contexts/AuthContext';
import AuthGuard from '@/components/AuthGuard';

function ProfilePage() {
  const { user } = useAuth();

  return (
    <AuthGuard>
      <div>
        <h1>Profile</h1>
        <p>Email: {user?.email}</p>
        <p>User ID: {user?.id}</p>
      </div>
    </AuthGuard>
  );
}
```

## Component Props

### AuthModal Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Whether the modal is open |
| `onClose` | `() => void` | Yes | Callback to close the modal |
| `onSuccess` | `() => void` | No | Callback after successful authentication |

### AuthGuard Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | Yes | Content to render when authenticated |
| `loadingComponent` | `ReactNode` | No | Custom loading component |
| `fallback` | `ReactNode` | No | Custom fallback when not authenticated |
| `showModal` | `boolean` | No | Whether to show auth modal automatically (default: true) |

## Features

### AuthModal Features

- **Dual Mode**: Toggle between sign in and sign up
- **Form Validation**: Client-side validation for email and password
- **Error Handling**: Display authentication errors to users
- **Loading States**: Show loading spinner during authentication
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Responsive Design**: Works on mobile and desktop

### AuthGuard Features

- **Automatic Protection**: Blocks unauthenticated access
- **Loading State**: Shows loading while checking authentication
- **Auto-prompt**: Automatically shows auth modal when needed
- **Flexible Fallback**: Customize the unauthenticated experience
- **Session Persistence**: Works with session refresh

## Best Practices

1. **Use AuthGuard for Pages**: Wrap entire pages or layouts with AuthGuard
2. **Use AuthModal for Actions**: Show AuthModal when user tries to perform protected actions
3. **Handle Success Callbacks**: Use `onSuccess` to continue user flow after authentication
4. **Customize Loading States**: Provide branded loading components for better UX
5. **Test Authentication Flows**: Ensure both sign in and sign up work correctly

## Integration with AuthContext

Both components use the `useAuth` hook from `AuthContext`:

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, signIn, signUp, signOut, loading } = useAuth();
  
  // user: Current authenticated user or null
  // signIn: Function to sign in with email/password
  // signUp: Function to sign up with email/password
  // signOut: Function to sign out
  // loading: Boolean indicating if auth state is loading
}
```

## Error Handling

The components handle various error scenarios:

- **Invalid Credentials**: Shows error message from Supabase
- **Network Errors**: Shows generic error message
- **Validation Errors**: Shows specific validation messages
- **Session Expiry**: Automatically prompts for re-authentication

## Styling

Components use Tailwind CSS classes and follow the app's design system:

- **Colors**: Green primary color (`green-600`, `green-700`)
- **Spacing**: Consistent padding and margins
- **Typography**: Clear hierarchy with proper font sizes
- **Animations**: Smooth transitions and loading spinners

## Testing

Both components have comprehensive unit tests covering:

- Rendering in different states
- Form validation
- Authentication flows
- Error handling
- User interactions
- Accessibility

Run tests with:
```bash
npm test -- --testPathPatterns="AuthModal|AuthGuard"
```

## Troubleshooting

### Modal doesn't appear
- Check that `isOpen` prop is `true`
- Verify AuthContext is properly set up in your app

### Authentication fails
- Check Supabase configuration in `.env.local`
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Check browser console for errors

### Protected content shows briefly before redirect
- This is normal during initial auth check
- Use the `loading` state from `useAuth` to show a loading screen

### Session not persisting
- Ensure AuthProvider wraps your entire app
- Check that Supabase client is properly configured
- Verify browser allows localStorage

## Related Documentation

- [AuthContext Usage Guide](../contexts/AuthContext.usage.md)
- [Supabase Client Configuration](../lib/supabase/client.ts)
- [Requirements Document](.kiro/specs/supabase-system-of-record/requirements.md)
- [Design Document](.kiro/specs/supabase-system-of-record/design.md)
