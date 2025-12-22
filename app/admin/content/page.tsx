import { getSiteContent } from "./actions"
import { ContentManager } from "./ContentManager"

export default async function AdminContentPage() {
  const content = await getSiteContent()

  return <ContentManager initialContent={content} />
}
