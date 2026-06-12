"""Playwright E2E 测试：验证 Step 5 BOCHK 准入评估 4 项修复

测试场景：Step 1 选择"深圳电子厂"模板（目标市场：东南亚、欧洲）
→ 进入 Step 5
→ 切换到 BOCHK 准入评估 tab
→ 回答所有问题并提交
→ 验证：
  1. 结果页标题为 "BOCHK 准入标准"，不出现新加坡/目的地文案
  2. ScoreBoard 只显示 E/G，不显示 S
  3. 结果页可以 tab 切换到目的地法规分析
  4. 点击"修改答案并重新提交"后答案保留

运行前请确保：
- 后端已启动：cd backend && python3 -m uvicorn app.main:app --port 8001
- 前端已启动：cd frontend && npm run dev
- 已安装 Playwright：python3 -m playwright install chromium

运行：python3 tests/e2e_esg_bochk_fixes_test.py
"""

from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"


def test_bochk_tab_fixes():
    """测试：BOCHK 准入评估结果页修复"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 900})

        page.on("console", lambda msg: print(f"  [console {msg.type}] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda err: print(f"  [page error] {err}"))

        print("1. 打开首页并进入 Wizard")
        page.goto(BASE_URL)
        page.get_by_text("开始体验").click()
        page.wait_for_url("**/wizard")

        print("2. Step 1：选择深圳电子厂模板")
        page.wait_for_selector("text=Step 1：企业画像", timeout=10000)
        page.get_by_text("深圳电子厂").click()
        page.get_by_text("确认画像，进入下一步：服务匹配").click()

        print("3. Step 4：进入 Step 5")
        page.wait_for_selector("text=Step 4：服务匹配", timeout=30000)
        page.wait_for_selector("text=下一步：ESG 合规分析", timeout=30000)
        page.get_by_text("下一步：ESG 合规分析").click()

        print("4. Step 5：切换到 BOCHK 准入评估 tab")
        page.wait_for_selector("text=ESG 合规分析", timeout=30000)
        page.get_by_text("BOCHK 准入评估").click()
        page.wait_for_timeout(200)

        # 统计 BOCHK 问题数
        question_ids = page.locator("span[class*='w-7 h-5 rounded']").all_inner_texts()
        print(f"   BOCHK 共 {len(question_ids)} 道题: {question_ids}")
        assert len(question_ids) == 5, f"BOCHK 应为 5 道题，实际 {len(question_ids)}"

        # 为每道题选择"部分满足"
        for qid in question_ids:
            card = page.locator("div.card", has=page.locator("span", has_text=qid))
            partial_btn = card.locator("button", has_text="部分满足")
            if partial_btn.count() > 0:
                partial_btn.first.scroll_into_view_if_needed()
                partial_btn.first.click()
                page.wait_for_timeout(50)

        answered = page.locator("button.bg-esg-yellow").count()
        print(f"   已回答 {answered}/{len(question_ids)}")
        assert answered == len(question_ids)

        print("5. 提交 BOCHK 分析")
        page.locator("button", has_text="提交分析").click()
        page.wait_for_selector("text=ESG 合规分析结果", timeout=120000)

        page_content = page.content()

        print("6. 验证修复 #1：结果页文案")
        assert "BOCHK 准入标准" in page_content, "未找到 BOCHK 准入标准标题"
        assert "本次分析基于 BOCHK 银行内部 ESG 准入标准" in page_content, "未找到 BOCHK 副标题"
        assert "新加坡" not in page_content, "BOCHK 结果页不应出现新加坡"
        assert "本次分析基于目标地区" not in page_content, "BOCHK 结果页不应出现目标地区文案"

        print("7. 验证修复 #2：ScoreBoard 不显示 S 维度")
        # 通过 DOM 检查：分项评分区域内不应有 "社会" 标签
        scoreboard = page.locator("text=分项评分").locator("..")
        assert scoreboard.locator("text=社会").count() == 0, "BOCHK 结果不应显示社会（S）维度"
        # 应显示 E 和 G
        assert "环境" in page_content, "应显示环境（E）维度"
        assert "治理" in page_content, "应显示治理（G）维度"

        print("8. 验证修复 #3：结果页 tab 切换")
        # 结果页上应仍能看见 tab 按钮
        dest_tab = page.get_by_text("目的地法规分析")
        bochk_tab = page.get_by_text("BOCHK 准入评估")
        assert dest_tab.count() > 0, "结果页应显示目的地法规分析 tab"
        assert bochk_tab.count() > 0, "结果页应显示 BOCHK 准入评估 tab"

        # 点击切换到目的地法规分析
        dest_tab.first.click()
        page.wait_for_timeout(500)
        # 此时应显示问卷或结果（如果之前没做则是问卷）
        assert page.locator("text=ESG 合规分析").count() > 0, "tab 切换后页面应仍显示 ESG 分析"

        # 切回 BOCHK
        page.get_by_text("BOCHK 准入评估").first.click()
        page.wait_for_timeout(500)
        assert "BOCHK 准入标准" in page.content(), "切回 BOCHK 后应仍显示 BOCHK 结果"

        print("9. 验证修复 #4：修改答案并重新提交保留答案")
        # 点击修改按钮
        page.get_by_text("修改答案并重新提交").click()
        page.wait_for_timeout(500)

        # 应回到问卷页，且之前选的"部分满足"仍被选中
        answered_after_reset = page.locator("button.bg-esg-yellow").count()
        print(f"   重置后已回答 {answered_after_reset}/{len(question_ids)}")
        assert answered_after_reset == len(question_ids), "修改答案后应保留原有答案"

        # 截图保存（保留答案状态）
        page.screenshot(path="demo/online_test_esg_bochk_fixes.png", full_page=True)
        print("   截图已保存：demo/online_test_esg_bochk_fixes.png")

        # 修改第一题 B1 为"满足"
        b1_card = page.locator("div.card", has=page.locator("span", has_text="B1"))
        b1_card.locator("button", has_text="满足").first.click()
        page.wait_for_timeout(200)

        # 重新提交
        page.locator("button", has_text="提交分析").click()
        page.wait_for_selector("text=ESG 合规分析结果", timeout=120000)
        assert "BOCHK 准入标准" in page.content(), "重新提交后应显示 BOCHK 结果"

        print("✅ BOCHK 准入评估 4 项修复测试通过")
        browser.close()


if __name__ == "__main__":
    test_bochk_tab_fixes()
    print("\n🎉 Playwright E2E 修复验证通过")
