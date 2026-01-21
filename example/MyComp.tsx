import { For, Suspense } from "solid-js";
import { createCachedResource, createMutation, mutateCachedValue } from "../";

interface User {
	id: string;
	firstName: string;
	lastName: string;
	photoURL: string;
}

const userKey = "users";
const useGetUsers = () => {
	return createCachedResource<User[]>(userKey, async () => {
		const response = await fetch("https://myapi.com/users");
		return (await response.json()) as User[];
	});
};

const useAddUser = () => {
	return createMutation(
		async (userData: User) => {
			const response = await fetch("https://myapi.com/users", {
				method: "POST",
				body: JSON.stringify(userData),
				headers: {
					"Content-Type": "application/json",
				},
			});
			return (await response.json()) as User;
		},
		{
			onSuccess: (user) => {
				mutateCachedValue(userKey, (users: User[]) => [...users, user]);
			},
		},
	);
};

const MyComp = () => {
	const [users] = useGetUsers();
	return (
		<Suspense>
			<For each={users()}>{(user) => <div>{user.firstName}</div>}</For>
		</Suspense>
	);
};
export default MyComp;
