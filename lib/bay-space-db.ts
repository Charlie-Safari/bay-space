import { promises as fs } from "fs";
import path from "path";
import { createHash, randomBytes, randomUUID } from "crypto";
import { BayMember, BayMemberRecord, BayPost, PublicLink } from "./bay-space-types";

type BaySpaceData = {
  members: BayMemberRecord[];
  posts: BayPost[];
  retiredMembers: string[];
};

type NewMemberInput = {
  name: string;
};

type UpdateMemberInput = {
  name: string;
  pin: string;
  refName: string;
  roles: string;
  title: string;
};

type NewPostInput = Omit<BayPost, "id" | "createdAt" | "dateKey">;

type MemberSettingsInput = {
  email?: string;
  birthdayMonth?: string;
  birthdayYear?: string;
  links?: {
    x?: PublicLink;
    linkedin?: PublicLink;
    github?: PublicLink;
    youtube?: PublicLink;
  };
};

const dataFile = path.join(process.cwd(), "data", "bay-space.json");
const firstMemberNumber = 33333;
const memberIdWidth = 5;
const adminMemberId = "33333";
const adminPinSalt = "bay-space-admin-33333";

let writeQueue = Promise.resolve();

function publicMember(member: BayMemberRecord): BayMember {
  const { pinHash, pinSalt, ...safeMember } = member;
  void pinHash;
  void pinSalt;
  return safeMember;
}

function formatMemberId(value: number) {
  return value.toString().padStart(memberIdWidth, "0");
}

function normalizeMember(value: string) {
  return value.replace(/\D/g, "").slice(0, memberIdWidth).padStart(memberIdWidth, "0");
}

function hashPin(pin: string, salt: string) {
  return createHash("sha256").update(`${salt}:${pin}`).digest("hex");
}

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getAdminMember(): BayMemberRecord {
  return {
    member: adminMemberId,
    name: "bay-oracle",
    refName: "bayo",
    roles: "creator/ influencer - conspiracy",
    title: "Influencer Creator Conspiracy",
    createdAt: "2026-05-14T00:00:00.000Z",
    pinHash: hashPin("lolol", adminPinSalt),
    pinSalt: adminPinSalt,
  };
}

function ensureAdminMember(data: BaySpaceData) {
  const adminMember = getAdminMember();
  const savedAdmin = data.members.find((member) => member.member === adminMemberId);

  if (savedAdmin) {
    savedAdmin.member = adminMember.member;
    savedAdmin.name = adminMember.name;
    savedAdmin.refName = adminMember.refName;
    savedAdmin.roles = adminMember.roles;
    savedAdmin.title = adminMember.title;
    savedAdmin.createdAt = savedAdmin.createdAt || adminMember.createdAt;
    savedAdmin.pinHash = savedAdmin.pinHash || adminMember.pinHash;
    savedAdmin.pinSalt = savedAdmin.pinSalt || adminMember.pinSalt;
  } else {
    data.members.unshift(adminMember);
  }

  data.retiredMembers = data.retiredMembers.filter(
    (member) => member !== adminMemberId,
  );

  return data;
}

async function readData(): Promise<BaySpaceData> {
  try {
    const rawData = await fs.readFile(dataFile, "utf8");
    const parsedData = JSON.parse(rawData) as Partial<BaySpaceData>;

    return ensureAdminMember({
      members: Array.isArray(parsedData.members) ? parsedData.members : [],
      posts: Array.isArray(parsedData.posts) ? parsedData.posts : [],
      retiredMembers: Array.isArray(parsedData.retiredMembers)
        ? parsedData.retiredMembers
        : [],
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return ensureAdminMember({ members: [], posts: [], retiredMembers: [] });
    }

    throw error;
  }
}

async function writeData(data: BaySpaceData) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(ensureAdminMember(data), null, 2));
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
    const usedMembers = new Set([
      ...data.members.map((member) => member.member),
      ...data.retiredMembers,
    ]);
    let nextMember = firstMemberNumber;

    while (usedMembers.has(formatMemberId(nextMember))) {
      nextMember += 1;
    }

    const member: BayMemberRecord = {
      member: formatMemberId(nextMember),
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

export async function getNextMemberId() {
  const data = await readData();
  const usedMembers = new Set([
    ...data.members.map((member) => member.member),
    ...data.retiredMembers,
  ]);
  let nextMember = firstMemberNumber;

  while (usedMembers.has(formatMemberId(nextMember))) {
    nextMember += 1;
  }

  return formatMemberId(nextMember);
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
    let member = data.members.find(
      (savedMember) => savedMember.member === normalizedMember,
    );

    if (normalizedMember === adminMemberId) {
      return publicMember(member ?? getAdminMember());
    }

    if (!member) {
      member = {
        member: normalizedMember,
        name: input.name.trim().slice(0, 24) || "explorer",
        refName: "",
        roles: "",
        title: "Curious Reader",
        createdAt: new Date().toISOString(),
        pinHash: "",
        pinSalt: "",
      };
      data.members.push(member);
    }

    const pinSalt = randomBytes(16).toString("hex");
    member.pinSalt = pinSalt;
    member.pinHash = hashPin(input.pin, pinSalt);
    member.name = input.name.trim().slice(0, 24) || "explorer";
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

export async function updateMemberSettings(
  memberId: string,
  input: MemberSettingsInput,
) {
  return updateData((data) => {
    const member = data.members.find(
      (savedMember) => savedMember.member === normalizeMember(memberId),
    );

    if (!member) {
      return null;
    }

    member.email = input.email?.trim().slice(0, 120) ?? "";
    member.birthdayMonth = input.birthdayMonth?.trim().slice(0, 2) ?? "";
    member.birthdayYear = input.birthdayYear?.trim().slice(0, 4) ?? "";
    member.links = {
      x: normalizePublicLink(input.links?.x),
      linkedin: normalizePublicLink(input.links?.linkedin),
      github: normalizePublicLink(input.links?.github),
      youtube: normalizePublicLink(input.links?.youtube),
    };

    return publicMember(member);
  });
}

function normalizePublicLink(link?: PublicLink) {
  return {
    url: link?.url.trim().slice(0, 240) ?? "",
    display: Boolean(link?.display),
  };
}

export async function wipeMemberAccount(memberId: string) {
  return updateData((data) => {
    const normalizedMember = normalizeMember(memberId);
    const originalLength = data.posts.length;
    data.posts = data.posts.filter((post) => post.author !== normalizedMember);

    return data.posts.length !== originalLength;
  });
}

export async function deleteMemberAccount(memberId: string) {
  return updateData((data) => {
    const normalizedMember = normalizeMember(memberId);

    if (normalizedMember === adminMemberId) {
      return false;
    }

    const memberExists = data.members.some(
      (member) => member.member === normalizedMember,
    );

    data.members = data.members.filter(
      (member) => member.member !== normalizedMember,
    );
    data.posts = data.posts.filter((post) => post.author !== normalizedMember);

    if (!data.retiredMembers.includes(normalizedMember)) {
      data.retiredMembers.push(normalizedMember);
    }

    return memberExists;
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

export async function listPostsByAuthor(memberId: string) {
  const data = await readData();
  const normalizedMember = normalizeMember(memberId);

  return data.posts
    .filter(
      (post) =>
        post.author === normalizedMember && !post.anonymous && !post.incognito,
    )
    .sort(
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
