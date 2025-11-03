import { test, expect } from '@playwright/test';

test.describe('홈 페이지', () => {
  test('메인 페이지가 로드되어야 함', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('h1')).toContainText('도구 모음');
  });

  test('도구 카드들이 표시되어야 함', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator('text=파일 처리 도구')).toBeVisible();
    await expect(page.locator('text=이미지 처리 도구')).toBeVisible();
    await expect(page.locator('text=영상 처리 도구')).toBeVisible();
  });

  test('네비게이션 메뉴가 작동해야 함', async ({ page }) => {
    await page.goto('/');
    
    await page.click('text=파일 도구');
    await expect(page).toHaveURL('/file-tools');
    
    await page.click('text=이미지 도구');
    await expect(page).toHaveURL('/image-tools');
    
    await page.click('text=홈');
    await expect(page).toHaveURL('/');
  });
});

test.describe('테마 토글', () => {
  test('테마 변경 버튼이 작동해야 함', async ({ page }) => {
    await page.goto('/');
    
    const themeToggle = page.locator('button[aria-label="테마 변경"]');
    await expect(themeToggle).toBeVisible();
    
    await themeToggle.click();
    
    // 다크 테마가 적용되었는지 확인
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('오프라인 상태', () => {
  test('오프라인 상태가 표시되어야 함', async ({ page, context }) => {
    await page.goto('/');
    
    // 온라인 상태 확인
    await expect(page.locator('text=온라인')).toBeVisible();
    
    // 오프라인 모드로 전환
    await context.setOffline(true);
    await page.reload();
    
    // 오프라인 상태 확인
    await expect(page.locator('text=오프라인')).toBeVisible();
  });
});
