"use client";

import { useParams } from "next/navigation";

import PostEditor from "../PostEditor";

export default function EditBlogPostPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  return <PostEditor postId={Number.isInteger(id) && id > 0 ? id : -1} />;
}