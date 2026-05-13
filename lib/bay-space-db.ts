import { promises as fs } from "fs";
import path from "path";
import { createHash, randomBytes, randomUUID } from "crypto";
import { BayMember, BayMemberRecord, BayPost } from "./bay-space-types";

type BaySpaceData = {
  members: BayMemberRecord[];
  posts: BayPost[];
};

type NewMemberInput = {
  name: string;
};

type UpdateMemberInput = {
  pin: string;
  refName: string;
  roles: string;
  title: string;
};

type NewPostInput = Omit<BayPost, "id" | "createdAt" | "dateKey">;

const dataFile = path.join(process.cwd(), "data", "bay-space.json");

let writeQueue = Promise.resolve();

function publicMember(member: BayMemberRecord): BayMember {
  const { pinHash, pinSalt, ...safeMember } = member;
  void pinHash;
  void pinSalt;
  return safeMember;
}

function formatMemberId(value: number) {
  return value.toString().padStart(3, "0");
}

function normalizeMember(value: string) {
  return value.replace(/\D/g, "").slice(0, 3).padStart(3, "0");
}

function hashPin(pin: string, salt: string) {
  return createHash("sha256").update(`${salt}:${pin}`).digest("hex");
}

function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function readData(): Promise<BaySpaceData> {
  try {
    const rawData = await fs.readFile(dataFile, "utf8");
    const parsedData = JSON.parse(rawData) as Partial<BaySpaceData>;

    return {
      members: Array.isArray(parsedData.members) ? parsedData.members : [],
      posts: Array.isArray(parsedData.posts) ? parsedData.posts : [],
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return { members: [], posts: [] };
    }

    throw error;
  }
}

async function writeData(data: BaySpaceData) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2));
}

async function updateData<T>(updater: (data: BaySpaceData) => T | Promise<T>) {
  const nextWrite = writeQueue.then(async () => {
    const data = await readData();
    const result = await updater(data);
    await writeData(data);
    return result;
  });

  writeQueue = nextWrite.then(
    () => undefined,
    () => undefined,
  );

  return nextWrite;
}

export async function createMember(input: NewMemberInput) {
  return updateData((data) => {
    const highestMember = data.members.reduce((highest, member) => {
      const memberNumber = Number(member.member);
      return Number.isFinite(memberNumber) ? Math.max(highest, memberNumber) : highest;
    }, 0);
    const member: BayMemberRecord = {
      member: formatMemberId(highestMember + 1),
      name: input.name.trim().slice(0, 24) || "explorer",
      refName: "",
      roles: "",
      title: "Curious Reader",
      createdAt: new Date().toISOString(),
      pinHash: "",
      pinSalt: "",
    };

    data.members.push(member);

    return publicMember(member);
  });
}

export async function getMember(memberId: string) {
  const data = await readData();
  const member = data.members.find(
    (savedMember) => savedMember.member === normalizeMember(memberId),
  );

  return member ? publicMember(member) : null;
}

export async function listMembers() {
  const data = await readData();
  return data.members.map(publicMember);
}

export async function completeMember(memberId: string, input: UpdateMemberInput) {
  return updateData((data) => {
    const normalizedMember = normalizeMember(memberId);
    const member = data.members.find(
      (savedMember) => savedMember.member === normalizedMember,
    );

    if (!member) {
      return null;
    }

    const pinSalt = randomBytes(16).toString("hex");
    member.pinSalt = pinSalt;
    member.pinHash = hashPin(input.pin, pinSalt);
    member.refName = input.refName.trim().slice(0, 40);
    member.roles = input.roles;
    member.title = input.title.trim().slice(0, 80) || "Curious Reader";

    return publicMember(member);
  });
}

export async function changeMemberPin(memberId: string, pin: string) {
  return updateData((data) => {
    const member = data.members.find(
      (savedMember) => savedMember.member === normalizeMember(memberId),
    );

    if (!member) {
      return null;
    }

    const pinSalt = randomBytes(16).toString("hex");
    member.pinSalt = pinSalt;
    member.pinHash = hashPin(pin, pinSalt);

    return publicMember(member);
  });
}

export async function verifyMemberPin(memberId: string, pin: string) {
  const data = await readData();
  const member = data.members.find(
    (savedMember) => savedMember.member === normalizeMember(memberId),
  );

  if (!member || !member.pinHash || !member.pinSalt) {
    return null;
  }

  return hashPin(pin, member.pinSalt) === member.pinHash
    ? publicMember(member)
    : null;
}

export async function listPosts(category?: string) {
  const data = await readData();
  const posts = category
    ? data.posts.filter((post) => post.category === category)
    : data.posts;

  return [...posts].sort(
    (leftPost, rightPost) =>
      new Date(rightPost.createdAt).getTime() -
      new Date(leftPost.createdAt).getTime(),
  );
}

export async function createPost(input: NewPostInput) {
  return updateData((data) => {
    const createdAt = new Date();
    const post: BayPost = {
      ...input,
      id: randomUUID(),
      incognito: input.incognito ?? false,
      createdAt: createdAt.toISOString(),
      dateKey: getDateKey(createdAt),
    };

    data.posts.unshift(post);

    return post;
  });
}

export async function deletePost(postId: string, author: string) {
  return updateData((data) => {
    const originalLength = data.posts.length;
    data.posts = data.posts.filter(
      (post) => post.id !== postId || post.author !== author,
    );

    return data.posts.length !== originalLength;
  });
}
