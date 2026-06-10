#!/bin/bash
# 智企通 MVP — Claude Code 状态栏
# 实时显示上下文窗口剩余量

input=$(cat)

# 提取上下文信息
used=$(echo "$input" | jq -r '.context_window.used_percentage // empty' 2>/dev/null)
total=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0' 2>/dev/null)
window=$(echo "$input" | jq -r '.context_window.context_window_size // 0' 2>/dev/null)
model=$(echo "$input" | jq -r '.model.display_name // "GLM-5.1"' 2>/dev/null)

if [ -n "$used" ]; then
  # 进度条（20格）
  bar_len=20
  filled=$(printf "%.0f" "$(echo "$used * $bar_len / 100" | bc -l 2>/dev/null || echo 0)")
  bar=""
  for ((i=0; i<bar_len; i++)); do
    if [ $i -lt "$filled" ]; then bar+="█"; else bar+="░"; fi
  done

  # 格式化输出
  if [ "$window" -gt 0 ] 2>/dev/null; then
    printf "%s | %s %.0f%% (%.0fk/%.0fk)" "$model" "$bar" "$used" "$(echo "$total/1000" | bc -l 2>/dev/null || echo 0)" "$(echo "$window/1000" | bc -l 2>/dev/null || echo 0)"
  else
    printf "%s | %s %.0f%%" "$model" "$bar" "$used"
  fi
else
  echo "$model | ⏳ 等待上下文..."
fi
