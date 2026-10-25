import { expect, test, type Page } from "@playwright/test"

import { signIn } from "./signIn"

const API = "http://localhost:4050/api"

async function findQuackNotBy(page: Page, username: string): Promise<{ id: string }> {
  const quacks: { id: string; user: { username: string } }[] = await (
    await page.request.get(`${API}/quacks`)
  ).json()
  return quacks.find((quack) => quack.user.username !== username)!
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
