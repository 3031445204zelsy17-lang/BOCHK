"""Playwright E2E 测试：验证 Step 5 ESG 分析按目标地区引用法规

测试场景：Step 1 选择“深圳电子厂”模板（目标市场：东南亚、欧洲）
→ 进入 Step 5 目的地法规分析
→ 回答所有问题并提交
→ 验证结果引用新加坡法规，不出现泰国法规

运行前请确保：
- 后端已启动：cd backend && python3 -m uvicorn app.main:app --port 8001
- 前端已启动：cd frontend && npm run dev
- 已安装 Playwright：python3 -m playwright install chromium

运行：python3 tests/e2e_esg_region_test.py
"""

from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"


def test_southeast_asia_shows_singapore_not_thailand():
    """测试：选择东南亚市场，ESG 结果应引用新加坡法规，不应出现泰国法规"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})

        # 监听前端错误
        page.on("console", lambda msg: print(f"  [console {msg.type}] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda err: print(f"  [page error] {err}"))
        page.on("requestfailed", lambda req: print(f"  [request failed] {req.url} {req.failure.error_text if req.failure else ''}"))

        print("1. 打开首页")
        page.goto(BASE_URL)
        page.get_by_text("开始体验").click()
        page.wait_for_url("**/wizard")

        print("2. Step 1：选择深圳电子厂模板（目标市场：东南亚、欧洲）")
        page.wait_for_selector("text=Step 1：企业画像", timeout=10000)
        page.get_by_text("深圳电子厂").click()

        # 验证目标市场标签显示东南亚和欧洲
        market_tags = page.locator("span.bg-bochk-blue\\/10").all_inner_texts()
        print(f"   模板目标市场: {market_tags}")
        assert "东南亚" in market_tags and "欧洲" in market_tags

        page.get_by_text("确认画像，进入下一步：服务匹配").click()

        print("3. Step 4：进入 Step 5")
        page.wait_for_selector("text=Step 4：服务匹配", timeout=30000)
        page.wait_for_selector("text=下一步：ESG 合规分析", timeout=30000)
        page.get_by_text("下一步：ESG 合规分析").click()

        print("4. Step 5：回答所有问题并提交")
        page.wait_for_selector("text=ESG 合规分析", timeout=30000)

        # 验证地区提示显示“新加坡”
        region_hint = page.locator("text=本次将按 新加坡 法规进行分析").inner_text()
        print(f"   {region_hint}")

        # 等待问题渲染
        page.wait_for_selector("text=提交分析", timeout=10000)

        # 统计问题数
        question_ids = page.locator("span[class*='w-7 h-5 rounded']").all_inner_texts()
        print(f"   发现 {len(question_ids)} 道题: {question_ids}")

        # 为每道题选择“部分满足”
        for qid in question_ids:
            card = page.locator("div.card", has=page.locator("span", has_text=qid))
            partial_btn = card.locator("button", has_text="部分满足")
            if partial_btn.count() > 0:
                partial_btn.first.scroll_into_view_if_needed()
                partial_btn.first.click()
                page.wait_for_timeout(50)

        answered = page.locator("button.bg-esg-yellow").count()
        print(f"   已回答 {answered}/{len(question_ids)}")
        assert answered == len(question_ids), f"还有 {len(question_ids) - answered} 道题未回答"

        page.locator("button", has_text="提交分析").click()

        print("5. 等待 ESG 结果页")
        page.wait_for_selector("text=ESG 合规分析结果", timeout=120000)

        # 验证结果
        page_content = page.content()

        # 地区提示
        assert "本次分析基于目标地区：新加坡 法规" in page_content, "未找到新加坡地区提示"

        # 不能有泰国
        assert "泰国" not in page_content, "结果中仍出现泰国法规引用"
        assert "Thailand" not in page_content, "结果中仍出现 Thailand 引用"

        # 必须有新加坡来源
        has_sg_source = any(kw in page_content for kw in ["SGX", "Singapore", "新加坡"])
        assert has_sg_source, "结果中未出现新加坡法规来源（SGX/Singapore/新加坡）"

        # 提取 source_ref 列表用于日志
        import re
        refs = re.findall(r'"source_ref":"([^"]+)"', page_content)
        print(f"   结果 source_ref: {refs}")

        print("✅ 东南亚 → 新加坡 ESG 法规引用测试通过")
        browser.close()


if __name__ == "__main__":
    test_southeast_asia_shows_singapore_not_thailand()
    print("\n🎉 Playwright E2E 测试通过")
