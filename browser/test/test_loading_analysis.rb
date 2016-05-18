load 'vidjil_browser.rb'
load 'browser_test.rb'

class TestSimple < BrowserTest

  def setup
    super
    if not defined? $b
      set_browser("/doc/analysis-example2.vidjil", "/doc/analysis-example2.analysis")
      $b.clone_in_scatterplot('0').wait_until_present
    end
  end

  def test_00_name
    assert ($b.graph_x_legend('0').text == 'diag')
    assert ($b.graph_x_legend('1').text == 'fu1')

    # It should be selected
    assert ($b.graph_x_legend('0', :class => 'graph_time2').exists?)
  end

  def test_00_order
    # fu1 should be before diag
    assert ($b.graph_x_legend('0').attribute_value('x') > $b.graph_x_legend('1').attribute_value('x'))
  end

  def test_00_custom_clone
    assert ($b.clone_info('0')[:name].text == 'Main ALL clone')

    $b.select_tag('0').click

    assert (not $b.clone_in_list('0').visible?)
    assert (not $b.clone_in_scatterplot('0').visible?)
    assert (not $b.clone_in_graph('0').visible?)

    $b.select_tag('0').click
  end

  def test_01_data_loaded
    qpcr = $b.external_data('qPCR')
    assert (qpcr[:name] == 'qPCR' and qpcr[:value] == 0.83), "qPCR external data not as expected"

    spike = $b.external_data('spikeZ')
    assert (spike[:name] == 'spikeZ' and spike[:value] == 0.01), "spikeZ external data not as expected"
  end

  def test_02_tag_names
    # Open tag selector
    $b.clone_info('1')[:star].click

    assert($b.tag_item('0')[:name].text == 'main clone')
    assert($b.tag_item('3')[:name].text == 'spike')
    assert($b.tag_item('5')[:name].text == 'custom tag')
  end

  def test_03_hidden_tags
    # Test that the two tags are hidden
    assert ($b.select_tag('4', :class => 'inactiveTag').exists?)
    assert ($b.select_tag('5', :class => 'inactiveTag').exists?)
  end

  def test_04_hide_clone
    assert ($b.clone_in_list('0').visible?)
    assert ($b.clone_in_scatterplot('0').visible?)
    assert ($b.clone_in_graph('0').visible?)

    # Hide the clone by affecting it to a hidden tag
    $b.clone_info('0')[:star].click
    $b.tag_item('4')[:name].click

    assert (not $b.clone_in_list('0').visible?)
    assert (not $b.clone_in_scatterplot('0').visible?)
    assert (not $b.clone_in_graph('0').visible?)

    # Unhide clone
    $b.element(:id => 'fastTag4', :class => 'inactiveTag').click
    assert (not $b.element(:id => 'fastTag4', :class => 'inactiveTag').exists?)
    assert ($b.clone_in_list('0').visible?)
    assert ($b.clone_in_scatterplot('0').visible?)
    assert ($b.clone_in_graph('0').visible?)
  end

  def test_05_check_cluster
    clustered = $b.clone_info('1')
    assert (clustered[:name].text == 'clone2'), "First clone of cluster should be clone2"
    assert ($b.clone_in_scatterplot('1').visible?)
    assert (not $b.clone_in_scatterplot('2').visible?)

    clustered[:cluster].click

    assert ($b.clone_in_scatterplot('1').visible?)
    assert ($b.clone_in_scatterplot('2').visible?)

    first_in_cluster = $b.clone_in_cluster('1', '1')
    second_in_cluster = $b.clone_in_cluster('1', '2')

    assert (first_in_cluster[:name].text == 'clone2')
    assert (second_in_cluster[:name].text == 'clone3')

    # Close the cluster
    clustered[:cluster].click
end

  def test_06_remove_cluster
    clustered = $b.clone_info('1')
    clustered[:cluster].click
    $b.clone_in_cluster('1', '2')[:delete].click

    assert (not $b.clone_cluster('1').visible?)
    
    assert ($b.clone_in_scatterplot('1').visible?)
    assert ($b.clone_in_scatterplot('2').visible?)

    clone3 = $b.clone_info('2')
    assert (clone3[:name].text == "clone3")
    assert (clone3[:system].text == "G")
  end

  def test_07_create_cluster
    $b.clone_in_scatterplot('1').click
    $b.clone_in_scatterplot('2').click(:control)

    $b.merge.click

    clustered = $b.clone_info('1')
    assert (clustered[:name].text == 'clone2')
    clustered[:cluster].click # Close the cluster
    assert ($b.clone_in_scatterplot('1').visible?)
    assert (not $b.clone_in_scatterplot('2').visible?)
  end

  def test_90_select_other
    # Click on first point
    $b.graph_x_legend('1').click
    assert ($b.graph_x_legend('1', :class => 'graph_time2').exists?)
    assert ($b.graph_x_legend('0', :class => 'graph_time').exists?)

    qpcr = $b.external_data('qPCR')
    assert (qpcr[:name] == 'qPCR' and qpcr[:value] == 0.024), "qPCR external data not as expected"

  end

  def test_zz_close
    close_everything
  end
end
