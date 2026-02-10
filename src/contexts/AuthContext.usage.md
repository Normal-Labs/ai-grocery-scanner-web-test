# AuthContext Usage Guide

This guide explains how to integrate and use the AuthContext in your application.

## Integration

### Step 1: Wrap your app with AuthProvider

Update `src/app/layout.tsx` to include the AuthProvider:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { TierProvider } from "@/contexts/TierContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Grocery Scanner",
  description: "Scan groceries and get AI-powered insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <TierProvider>
            {children}
          </TierProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Step 2: Use the useAuth hook in components

```tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';

export function MyComponent() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div>
        <h1>Please sign in</h1>
        <button onClick={() => signIn('user@example.com', 'password')}>
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome, {user.email}</h1>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

## API Reference

### AuthProvider

Wraps your application and provides authentication state.

**Props:**
- `children: ReactNode` - Your application components

### useAuth()

Hook to access authentication state and methods.

**Returns:**
- `user: User | null` - Current authenticated user
- `session: Session | null` - Current session
- `loading: boolean` - Whether auth state is being initialized
- `signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>` - Sign up a new user
- `signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>` - Sign in an existing user
- `signOut: () => Promise<{ error: AuthError | null }>` - Sign out the current user

## Examples

### Sign Up Form

```tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { error } = await signUp(email, password);
    if (error) {
      setError(error.message);
    } else {
      // Success! User is now signed up
      console.log('Sign up successful');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Sign Up</button>
    </form>
  );
}
```

### Sign In Form

```tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message);
    } else {
      // Success! User is now signed in
      console.log('Sign in successful');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Sign In</button>
    </form>
  );
}
```

### Protected Component

```tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function ProtectedComponent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login page if not authenticated
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div>
      <h1>Protected Content</h1>
      <p>Only authenticated users can see this.</p>
    </div>
  );
}
```

### User Profile Display

```tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';

export function UserProfile() {
  const { user, signOut } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="user-profile">
      <img src={user.user_metadata?.avatar_url} alt="Avatar" />
      <p>{user.email}</p>
      <p>User ID: {user.id}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### Conditional Rendering Based on Auth State

```tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const { user, loading } = useAuth();

  return (
    <header>
      <h1>AI Grocery Scanner</h1>
      {loading ? (
        <div>Loading...</div>
      ) : user ? (
        <div>
          <span>Welcome, {user.email}</span>
          <button onClick={() => signOut()}>Sign Out</button>
        </div>
      ) : (
        <div>
          <a href="/login">Sign In</a>
          <a href="/signup">Sign Up</a>
        </div>
      )}
    </header>
  );
}
```

## Requirements Satisfied

- **Requirement 1.1**: Authenticate users using Supabase Auth ✓
- **Requirement 1.6**: Maintain user session state across page refreshes ✓
- **Requirement 6.5**: Handle authentication state changes automatically ✓

## Notes

- The AuthProvider must be a client component (uses 'use client' directive)
- Session state is automatically persisted to localStorage by Supabase
- Token refresh is handled automatically by Supabase
- The loading state prevents hydration mismatches during SSR
- Always check the loading state before rendering auth-dependent UI
