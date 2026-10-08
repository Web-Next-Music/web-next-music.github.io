"use client";

import {
	createContext,
	useContext,
	useLayoutEffect,
	useRef,
	useState,
	type ReactNode,
} from "react";
import {
	QueryClient,
	QueryClientProvider,
	useMutation,
	useQuery,
	type QueryKey,
} from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

export const queryKeys = {
	private: (userId: string | undefined, resource: string) =>
		["private", userId, resource] as const,
	public: (userId: string, resource: string) =>
		["public", userId, resource] as const,
};

type AuthScope = { viewer: string | null; generation: number };
type QueryScope = {
	scope: AuthScope;
	ready: boolean;
	isCurrent: () => boolean;
};

const QueryScopeContext = createContext<QueryScope | null>(null);

export class AuthScopeChangedError extends Error {
	constructor() {
		super("The account changed before this operation completed.");
		this.name = "AuthScopeChangedError";
	}
}

export function useQueryScope() {
	const context = useContext(QueryScopeContext);
	if (!context) throw new Error("QueryProvider is required.");
	return {
		...context,
		key: (key: QueryKey) => [...key, { authScope: context.scope }] as const,
	};
}

export function usePrivateQuery<T>(
	userId: string | undefined,
	resource: string,
	queryFn: () => Promise<T>,
) {
	const auth = useQueryScope();
	const queryKey = auth.key(queryKeys.private(userId, resource));
	const query = useQuery({
		queryKey,
		queryFn: async () => {
			if (!auth.isCurrent()) throw new AuthScopeChangedError();
			const data = await queryFn();
			if (!auth.isCurrent()) throw new AuthScopeChangedError();
			return data;
		},
		enabled: auth.ready && Boolean(userId) && userId === auth.scope.viewer,
	});
	return { ...query, queryKey };
}

export function usePublicQuery<T>(
	userId: string,
	resource: string,
	queryFn: () => Promise<T>,
	enabled = true,
) {
	const auth = useQueryScope();
	const queryKey = auth.key(queryKeys.public(userId, resource));
	const query = useQuery({
		queryKey,
		queryFn: async () => {
			if (!auth.isCurrent()) throw new AuthScopeChangedError();
			const data = await queryFn();
			if (!auth.isCurrent()) throw new AuthScopeChangedError();
			return data;
		},
		enabled: enabled && auth.ready,
	});
	return { ...query, queryKey };
}

type AuthMutationOptions<TData, TVariables> = {
	mutationFn: (variables: TVariables) => Promise<TData>;
	onSuccess?: (data: TData, variables: TVariables) => void | Promise<unknown>;
	onSettled?: () => void | Promise<unknown>;
	scope?: { id: string };
};

export function useAuthMutation<TData, TVariables>(
	options: AuthMutationOptions<TData, TVariables>,
) {
	const auth = useQueryScope();
	type Operation = {
		variables: TVariables;
		options: AuthMutationOptions<TData, TVariables>;
		isCurrent: () => boolean;
	};
	const mutation = useMutation<TData, Error, Operation>({
		scope: options.scope
			? { id: `${options.scope.id}:${auth.scope.generation}` }
			: undefined,
		mutationFn: async (operation) => {
			if (!operation.isCurrent()) throw new AuthScopeChangedError();
			const data = await operation.options.mutationFn(operation.variables);
			if (!operation.isCurrent()) throw new AuthScopeChangedError();
			return data;
		},
		onSuccess: (data, operation) => {
			if (operation.isCurrent())
				return operation.options.onSuccess?.(data, operation.variables);
		},
		onSettled: (_, __, operation) => {
			if (operation.isCurrent()) return operation.options.onSettled?.();
		},
	});
	const current = !mutation.variables || mutation.variables.isCurrent();
	return {
		isPending: current && mutation.isPending,
		error: current ? mutation.error : null,
		mutate: (variables: TVariables) =>
			mutation.mutate({ variables, options, isCurrent: auth.isCurrent }),
		mutateAsync: (variables: TVariables) =>
			mutation.mutateAsync({ variables, options, isCurrent: auth.isCurrent }),
	};
}

function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				retry: (count, error) =>
					!(error instanceof AuthScopeChangedError) && count < 1,
			},
			mutations: { retry: false },
		},
	});
}

export function QueryProvider({ children }: { children: ReactNode }) {
	const { user, loading } = useAuth();
	const viewer = user?.id ?? null;
	const [client] = useState(createQueryClient);
	const [scope, setScope] = useState<AuthScope>(() => ({
		viewer,
		generation: 0,
	}));
	const current = useRef({ scope, ready: !loading });
	const ready = !loading && scope.viewer === viewer;

	useLayoutEffect(() => {
		if (scope.viewer === viewer) {
			current.current = { scope, ready: !loading };
			return;
		}
		const next = { viewer, generation: scope.generation + 1 };
		current.current = { scope: next, ready: !loading };
		setScope(next);
		const isAuthQuery = (key: QueryKey) =>
			key[0] === "private" || key[0] === "public";
		void client.cancelQueries({
			predicate: (query) => isAuthQuery(query.queryKey),
		});
		client.removeQueries({
			predicate: (query) =>
				isAuthQuery(query.queryKey) &&
				(!query.isActive() ||
					query.queryKey.some(
						(part) =>
							typeof part === "object" && part !== null && "authScope" in part,
					)),
		});
		void client.resetQueries({
			predicate: (query) => isAuthQuery(query.queryKey),
		});
	}, [client, loading, scope, viewer]);

	return (
		<QueryClientProvider client={client}>
			<QueryScopeContext.Provider
				value={{
					scope:
						scope.viewer === viewer
							? scope
							: { viewer, generation: scope.generation + 1 },
					ready,
					isCurrent: () =>
						ready && current.current.ready && current.current.scope === scope,
				}}
			>
				{children}
			</QueryScopeContext.Provider>
		</QueryClientProvider>
	);
}
