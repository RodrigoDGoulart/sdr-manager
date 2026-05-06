type MockResponse<T> = Promise<{ data: T }>;

export interface AuthResponse {
  token: string;
  name: string;
  email: string;
}

export interface UserProfile {
  name: string;
  email: string;
}

export interface Workspace {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

const mockBackendError = <T>(operation: string): MockResponse<T> =>
  Promise.reject({
    response: {
      status: 503,
      data: {
        error: `Back-end removido. Resposta mockada para: ${operation}`,
      },
    },
  });

export const userService = {
  login: (email: string, password: string) => {
    void email;
    void password;
    return mockBackendError<AuthResponse>('login');
  },

  register: (name: string, email: string, password: string) => {
    void name;
    void email;
    void password;
    return mockBackendError<AuthResponse>('register');
  },

  getById: (id: string) => {
    void id;
    return mockBackendError<UserProfile>('get user by id');
  },

  update: (id: string, data: { name?: string; email?: string }) => {
    void id;
    void data;
    return mockBackendError<UserProfile>('update user');
  },

  remove: (id: string) => {
    void id;
    return mockBackendError<void>('remove user');
  },
};

export const workspaceService = {
  list: () => mockBackendError<Workspace[]>('list workspaces'),

  getById: (id: string) => {
    void id;
    return mockBackendError<Workspace>('get workspace by id');
  },

  create: (name: string) => {
    void name;
    return mockBackendError<Workspace>('create workspace');
  },

  update: (id: string, name: string) => {
    void id;
    void name;
    return mockBackendError<Workspace>('update workspace');
  },

  remove: (id: string) => {
    void id;
    return mockBackendError<void>('remove workspace');
  },
};

export default {};
