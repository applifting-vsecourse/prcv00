# Story: Ask a question with answers to pick from

**As a** Quacker user
**I want to** ask a question with a few answers and let everyone pick one
**So that** I get a correct count without tallying replies by hand, and the answer isn't buried under replies

This is a small first version. We want to see whether people use it before building more.

## Acceptance criteria

All checked while signed in, unless the criterion says otherwise.

### Asking a question

1. When writing a quack, I can add answers to it. The quack's text is the question.
2. A question has at least 2 and at most 6 answers. I can add and remove answers while writing.
3. Each answer has at most 50 characters.
4. An empty answer, or two answers that are the same (ignoring capital letters and spaces at the ends, so "Pizza" and "pizza " count as the same), are refused with a message under that answer. Nothing is posted.
5. A question still needs text, like any quack, and can have a mood.
6. Once posted, the question and its answers can't be changed.

### Voting

7. I vote by clicking an answer. My pick is marked, and the numbers change straight away, without waiting.
8. I have one vote per question. Clicking a different answer moves my vote there.
9. Clicking the answer I picked takes my vote back. Then I've picked nothing.
10. The author can vote in their own question, like anyone else.
11. If I click between answers quickly, the last one I clicked is the one that counts.
12. Nobody can see who picked which answer. I see only which answer I picked myself.

### The numbers

13. Each answer shows how many people picked it, its percentage, and a bar of that size. Under the answers, the question shows the total number of votes, e.g. "5 votes" or "1 vote".
14. Percentages are whole numbers and always add up to exactly 100. Three equal answers show 34 %, 33 % and 33 %, not 33 % three times.
15. Everyone sees the numbers, also before they vote.
16. Two people looking at the same question see the same numbers once their page has caught up. Nobody's vote is counted twice or lost.
17. When others vote, I see the new numbers the next time the feed refreshes: after I vote or post, or when I come back to the browser tab. They don't change while I'm just watching.
18. Answers stay in the order the author wrote them, whatever the votes.

### When a vote doesn't go through

19. My pick and the numbers go back to what they were before I clicked.
20. A message under that question says the vote didn't go through and asks me to try again. The rest of the page is unaffected.

### Closing a question

21. The author sees a "Close question" button on their own questions. Nobody else sees it.
22. Closing asks "Are you sure?" first. A closed question can't be opened again.
23. A closed question is marked "Closed". Its final numbers, and the answer I picked, stay visible. Nobody can vote, change or take back a vote.
24. If I vote on a question that was closed a moment ago, before my page knew, my vote isn't counted. The question shows as closed with its final numbers and says "This question was closed before your vote."

### Elsewhere

25. Searching the feed also finds words that appear only in a question's answers, and highlights them there.
26. **Signed out:** the peek at the feed on the welcome page shows questions with their answers and numbers, but the answers can't be clicked.

### What you see when there is nothing to show

27. **No votes yet:** the answers are listed without percentages or bars, and under them it says "No votes yet".
28. **Everyone took their vote back:** the question looks the same as with no votes yet.

## Out of scope

- Measuring how many people ask questions and vote (a separate story)
- Numbers that update live while you watch
- Seeing who voted for what, for anyone including the author
- Changing or deleting a question after posting
- Questions that close by themselves after a set time, or reopening a closed question
- Picking more than one answer
- Answers with pictures, or answers added by other people
