// RevenueChart 周期切换竞态测试（G-2 / R-22）
// 覆盖：慢请求晚到不覆盖最新周期数据（请求序号守卫），晚到失败不误报错误态
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

if (!window.matchMedia) {
  window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })
}

const h = vi.hoisted(() => ({
  getDashboardRevenue: vi.fn(),
  msgError: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ locale: { value: 'zh-CN' }, t: (key) => key })
}))

vi.mock('element-plus', () => ({
  ElMessage: { success: vi.fn(), error: h.msgError, warning: vi.fn(), info: vi.fn() }
}))

vi.mock('../../../../api/index.js', () => ({
  artistApi: {
    getDashboardRevenue: h.getDashboardRevenue
  }
}))

// normalize/useCountUp 与竞态无关，用透传/固定值隔离
vi.mock('../../../../utils/dashboard-normalize.js', () => ({
  normalizeRevenue: (res) => ({ bars: res.bars, summary: res.summary })
}))
vi.mock('../../../../utils/useCountUp.js', async () => {
  const { reactive, ref, watch, isRef } = await import('vue')
  return {
    // 简化：display 直接跟随目标值（滚动动画与竞态无关）
    useCountUp: (target) => {
      const display = ref(isRef(target) ? target.value : target)
      watch(() => (isRef(target) ? target.value : target), (v) => { display.value = v })
      return reactive({ display })
    }
  }
})

vi.mock('../visual/CardHead.vue', () => ({
  default: { name: 'CardHead', template: '<div><slot /><slot name="extra" /></div>' }
}))

import RevenueChart from '../RevenueChart.vue'
import SliderSwitch from '../../SliderSwitch.vue'

const MONTH_RES = {
  bars: [{ label: '1月', cents: 1000 }, { label: '2月', cents: 2000 }],
  summary: { totalCents: 3000, orderCount: 2, changePct: 10, prevLabel: '上月' }
}
const QUARTER_RES = {
  bars: [{ label: 'Q1', cents: 9000 }],
  summary: { totalCents: 9000, orderCount: 1, changePct: null }
}

function mountChart() {
  return mount(RevenueChart, {
    global: {
      mocks: {
        $t: (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key)
      },
      stubs: {
        'el-card': { template: '<div><slot /><slot name="header" /></div>' },
        'el-button': { template: '<button><slot /></button>' },
        'el-icon': { template: '<i><slot /></i>' }
      }
    }
  })
}

beforeEach(() => {
  h.getDashboardRevenue.mockReset()
  h.msgError.mockClear()
})

describe('RevenueChart 竞态守卫（G-2）', () => {
  it('狂切周期：晚到的旧请求不覆盖最新周期柱图', async () => {
    let resolveMonth
    let resolveQuarter
    h.getDashboardRevenue
      .mockReturnValueOnce(new Promise(resolve => { resolveMonth = resolve }))
      .mockReturnValueOnce(new Promise(resolve => { resolveQuarter = resolve }))

    const wrapper = mountChart()
    await flushPromises()

    // 模拟切到「季」周期（SliderSwitch change → load）
    const slider = wrapper.findComponent(SliderSwitch)
    slider.vm.$emit('update:modelValue', 'quarter')
    slider.vm.$emit('change', 'quarter')
    await flushPromises()

    // 新请求（季）先返回
    resolveQuarter(QUARTER_RES)
    await flushPromises()
    // 旧请求（月）晚到
    resolveMonth(MONTH_RES)
    await flushPromises()

    const labels = wrapper.findAll('.chart-label').map(el => el.text())
    expect(labels).toEqual(['Q1'])
    expect(wrapper.text()).toContain('¥90.00')
  })

  it('晚到的旧请求失败不覆盖最新成功态（不误报错误）', async () => {
    let rejectMonth
    let resolveQuarter
    h.getDashboardRevenue
      .mockReturnValueOnce(new Promise((resolve, reject) => { rejectMonth = reject }))
      .mockReturnValueOnce(new Promise(resolve => { resolveQuarter = resolve }))

    const wrapper = mountChart()
    await flushPromises()

    const slider = wrapper.findComponent(SliderSwitch)
    slider.vm.$emit('update:modelValue', 'quarter')
    slider.vm.$emit('change', 'quarter')
    await flushPromises()

    resolveQuarter(QUARTER_RES)
    await flushPromises()
    rejectMonth(new Error('stale'))
    await flushPromises()

    expect(h.msgError).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('dashboard.revenueError')
    expect(wrapper.findAll('.chart-label').map(el => el.text())).toEqual(['Q1'])
  })
})
