"use client";
import { useParams } from "next/navigation";
import PostEditor from "../PostEditor";
export default function EditArticlePage() { const { id } = useParams<{ id: string }>(); return <PostEditor postId={Number(id)} />; }