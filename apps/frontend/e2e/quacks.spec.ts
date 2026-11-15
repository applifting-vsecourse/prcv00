import { expect, test, type Page } from "@playwright/test"

import { signIn } from "./signIn"

const API = "http://localhost:4050/api"

async function findQuackNotBy(page: Page, username: string): Promise<{ id: string }> {
  const quacks: { id: string; user: { username: string } | null }[] = await (
    await page.request.get(`${API}/quacks`)
  ).json()
  // A deleted quack has no author, so it is nobody's to delete.
  return quacks.find((quack) => quack.user && quack.user.username !== username)!
}

test("author can post a quack and delete it", async ({ page }) => {
  const text = `E2E quack ${Date.now()}`
  await signIn(page, "caffeinatedduck@example.com", "password1")
  await page.goto("/quacks")

  await page.getByLabel("New quack").fill(text)
  await page.getByRole("button", { name: "Quack", exact: true }).click()
  const quack = page.getByRole("article").filter({ hasText: text })
  await expect(quack).toBeVisible()

  await quack.getByRole("button", { name: "Delete quack" }).click()
  // The confirmation is an alert dialog (role "alertdialog"), as fits a
  // destructive action, so getByRole("dialog") wouldn't find it.
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click()
  await expect(quack).toHaveCount(0)
})

test("clicking a hashtag shows only the quacks that carry it", async ({ page }) => {
  // A tag nobody else has, so exactly one quack carries it.
  const tag = `e2e${Date.now()}`
  const text = `Exam done #${tag.toUpperCase()}`
  await signIn(page, "caffeinatedduck@example.com", "password1")
  await page.goto("/quacks")

  await page.getByLabel("New quack").fill(text)
  await page.getByRole("button", { name: "Quack", exact: true }).click()
  const quack = page.getByRole("article").filter({ hasText: text })
  await expect(quack).toBeVisible()

  // Capitals as written in the link, lowercase in the filter.
  const filtered = page.waitForResponse(
    (response) => response.url().includes(`tag=${tag}`) && response.request().method() === "GET",
  )
  await quack.getByRole("link", { name: `#${tag.toUpperCase()}` }).click()
  expect((await filtered).status()).toBe(200)

  await expect(page).toHaveURL(new RegExp(`/quacks\\?tag=${tag}$`))
  await expect(page.getByText("Quacks tagged")).toContainText(`#${tag}`)
  await expect(page.getByRole("article")).toHaveCount(1)
  await expect(quack).toBeVisible()

  await page.getByRole("button", { name: "Clear hashtag" }).click()
  await expect(page).toHaveURL(/\/quacks$/)
  await expect(page.getByRole("article").nth(1)).toBeVisible()

  // Leave the feed as it was.
  await quack.getByRole("button", { name: "Delete quack" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click()
  await expect(quack).toHaveCount(0)
})

test("admin can delete someone else's quack", async ({ browser }) => {
  const text = `Spam ${Date.now()}`
  // One page holds one session, so the author and the admin each get their own.
  const author = await browser.newPage()
  await signIn(author, "caffeinatedduck@example.com", "password1")
  // The author posts the quack this test deletes, so the seed stays intact.
  const posted = await author.request.post(`${API}/quacks`, { data: { text } })
  expect(posted.status()).toBe(201)
  const { id } = (await posted.json()) as { id: string }

  const admin = await browser.newPage()
  await signIn(admin, "admin@example.com", "adminpassword")
  await admin.goto("/quacks")
  const quack = admin.getByRole("article").filter({ hasText: text })
  await quack.getByRole("button", { name: "Delete quack" }).click()

  const dialog = admin.getByRole("alertdialog")
  // Someone else's quack: the confirmation says whose it is.
  await expect(dialog).toContainText("Delete Caffeinated Duck's (@CaffeinatedDuck) quack?")
  // Wait for the server's answer itself: a vanished quack alone would also
  // pass if the whole feed disappeared (e.g. an error page).
  const deleted = admin.waitForResponse(
    (response) =>
      response.request().method() === "DELETE" && response.url().endsWith(`/quacks/${id}`),
  )
  await dialog.getByRole("button", { name: "Delete" }).click()
  expect((await deleted).status()).toBe(204)
  await expect(quack).toHaveCount(0)
  await expect(admin.getByRole("heading", { name: "Quacks" })).toBeVisible()

  // Gone for real, not just from the admin's screen.
  const mine = (await (await author.request.get(`${API}/quacks?mine=true`)).json()) as {
    id: string
  }[]
  expect(mine.map((q) => q.id)).not.toContain(id)

  await author.close()
  await admin.close()
})

test("nobody can delete someone else's quack", async ({ page }) => {
  await signIn(page, "deepduckthoughts@example.com", "password2")
  await page.goto("/quacks")

  const othersQuack = page.getByRole("article").filter({ hasNotText: "@DeepDuckThoughts" }).first()
  await expect(othersQuack.getByRole("button", { name: "Delete quack" })).toHaveCount(0)

  // The button is hidden. Now skip the UI and ask the server directly.
  const notMine = await findQuackNotBy(page, "DeepDuckThoughts")
  const response = await page.request.delete(`${API}/quacks/${notMine.id}`)
  expect(response.status()).toBe(403)
})

type ApiQuack = { id: string; text: string | null; user: unknown; isDeleted: boolean }

test("deleting a quack with replies keeps the replies and removes its content everywhere", async ({
  browser,
}) => {
  const stamp = Date.now()
  const text = `Bread meeting ${stamp}`
  const replyText = `Count me in ${stamp}`
  // One page holds one session, so the author and the replier each get their own.
  const author = await browser.newPage()
  await signIn(author, "caffeinatedduck@example.com", "password1")
  const replier = await browser.newPage()
  await signIn(replier, "deepduckthoughts@example.com", "password2")

  await author.goto("/quacks")
  await author.getByLabel("New quack").fill(text)
  await author.getByRole("button", { name: "Quack", exact: true }).click()
  const quack = author.getByRole("article").filter({ hasText: text })
  await expect(quack).toBeVisible()
  const mine = (await (await author.request.get(`${API}/quacks?mine=true`)).json()) as ApiQuack[]
  const { id } = mine.find((q) => q.text === text)!

  // Someone else replies on the conversation page.
  await replier.goto(`/quacks/${id}`)
  await replier.getByRole("textbox", { name: "Reply to @CaffeinatedDuck" }).fill(replyText)
  const posted = replier.waitForResponse(
    (response) => response.request().method() === "POST" && response.url().endsWith("/quacks"),
  )
  await replier.getByRole("button", { name: "Reply", exact: true }).click()
  expect((await posted).status()).toBe(201)
  await expect(replier.getByText(replyText)).toBeVisible()

  // The feed counts the reply on the quack; the reply itself stays off the feed.
  await author.reload()
  await expect(quack.getByRole("link", { name: "1 reply" })).toBeVisible()
  await expect(author.getByRole("article").filter({ hasText: replyText })).toHaveCount(0)

  // The author deletes the quack.
  const deleted = author.waitForResponse(
    (response) =>
      response.request().method() === "DELETE" && response.url().endsWith(`/quacks/${id}`),
  )
  await quack.getByRole("button", { name: "Delete quack" }).click()
  await author.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click()
  expect((await deleted).status()).toBe(204)
  await expect(quack).toHaveCount(0)

  // The reply stays in the conversation, under an empty marker.
  await replier.reload()
  await expect(replier.getByText("This quack was deleted.")).toBeVisible()
  await expect(replier.getByText(replyText)).toBeVisible()
  await expect(replier.getByText(text)).toHaveCount(0)

  // Deleted means deleted everywhere, also when asking the server directly.
  const conversation = (await (
    await replier.request.get(`${API}/quacks/${id}/conversation`)
  ).json()) as ApiQuack[]
  expect(conversation.find((q) => q.id === id)).toMatchObject({
    text: null,
    user: null,
    isDeleted: true,
  })
  const found = (await (
    await replier.request.get(`${API}/quacks?q=${encodeURIComponent(text)}`)
  ).json()) as ApiQuack[]
  expect(found).toHaveLength(0)
  // Nobody can reply to it or delete it again.
  const lateReply = await replier.request.post(`${API}/quacks`, {
    data: { text: "late", parentId: id },
  })
  expect(lateReply.status()).toBe(409)
  expect((await author.request.delete(`${API}/quacks/${id}`)).status()).toBe(404)

  // Deleting the last reply takes the marker, and so the conversation, with it.
  const replyId = conversation.find((q) => q.text === replyText)!.id
  expect((await replier.request.delete(`${API}/quacks/${replyId}`)).status()).toBe(204)
  expect((await replier.request.get(`${API}/quacks/${id}/conversation`)).status()).toBe(404)
  await replier.reload()
  await expect(replier.getByText("This conversation no longer exists.")).toBeVisible()

  await author.close()
  await replier.close()
})
